"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import type { Citation } from "@/lib/citations";
import {
  listConversations,
  getConversation,
  deleteConversation,
  archiveConversationNow,
  type ConversationRow,
  type ConversationDetail,
  type ServerMessage,
  type PurgeReceipt,
  type ArchiveRecord,
  type RetentionInfo,
} from "@/lib/conversationsApi";

/** Outcome of archiving a chat early: its summary, or why it was refused. */
export type ArchiveOutcome =
  | { archived: true; archive: ArchiveRecord | null }
  | { archived: false; message: string };

/** Outcome of deleting one chat: gone (with the server's receipt when it had one), or refused by a hold. */
export type DeleteOutcome =
  | { deleted: true; receipt: PurgeReceipt | null }
  | { deleted: false; held: true; message: string };

/** Outcome of clearing every chat: totals over the receipts, and how many were left because of a hold. */
export type ClearOutcome = {
  deleted: number;
  held: number;
  messages: number;
  memoriesKept: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
  citations?: Citation[];
  mode?: "retrieval" | "document" | "knowledge_base" | "private" | "simple" | "memory";
  createdAt?: number;
};

/** What the server knows about a thread, kept so the sidebar can list threads not yet loaded here. */
export type ConversationMeta = {
  title: string | null;
  count: number;
  when?: number;
  /** "archived": summarised by retention, messages gone, read-only */
  state?: "active" | "archived";
  archivedAt?: number;
  legalHold?: boolean;
  /** the summary record, once the thread has been opened here */
  archive?: ArchiveRecord | null;
};

/**
 * Local storage is per browser, not per login, so every key below is
 * scoped by the user id in the token. Two people sharing a machine never
 * see each other's cached threads, and the server sync fills in each
 * user's own threads on login.
 */
function currentUserId(): string {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "anon";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.userId === "string" ? payload.userId : "anon";
  } catch {
    return "anon";
  }
}
const LIST_KEY = () => `cortex_chat_list_u_${currentUserId()}`;
const CURRENT_KEY = () => `cortex_current_session_u_${currentUserId()}`;
const CONV_KEY = () => `cortex_conversation_map_u_${currentUserId()}`; // local session id -> server conversation id
const sessionKey = (id: string) => `cortex_chat_u_${currentUserId()}_${id}`;

/**
 * Threads cached before threads were saved on the server used unscoped
 * keys. They belong to no one in particular and were never on the
 * server, so they are removed once, the first time the new store runs.
 */
function purgeLegacyLocalChats() {
  if (typeof window === "undefined") return;
  const legacy = ["cortex_chat_list", "cortex_current_session", "cortex_conversation_map"];
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (legacy.includes(k) || (k.startsWith("cortex_chat_") && !k.includes("_u_"))) doomed.push(k);
  }
  for (const k of doomed) localStorage.removeItem(k);
}

// =============================================================
//  LOCAL STORAGE HELPERS
//  The server is the source of truth for threads (design doc D7);
//  local storage is a cache so the page paints before the network.
// =============================================================
function loadChatList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatList(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIST_KEY(), JSON.stringify(list));
}

function loadConvMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONV_KEY());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConvMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONV_KEY(), JSON.stringify(map));
}

/** Server conversation id for a local session, if one has been assigned. */
export function getConversationId(sessionId: string | null): string | null {
  if (!sessionId) return null;
  return loadConvMap()[sessionId] || null;
}

export function setConversationId(sessionId: string, conversationId: string) {
  const map = loadConvMap();
  if (map[sessionId] === conversationId) return;
  map[sessionId] = conversationId;
  saveConvMap(map);
}

function forgetConversation(sessionId: string) {
  const map = loadConvMap();
  if (!(sessionId in map)) return;
  delete map[sessionId];
  saveConvMap(map);
}

/** Read a session's messages straight from storage (used for chat previews). */
export function readSessionMessages(sessionId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionKey(sessionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatLocal(sessionId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(sessionKey(sessionId), JSON.stringify(messages));
}

function createLocalSession(): string {
  const id = crypto.randomUUID();
  const list = loadChatList();
  list.unshift(id);
  saveChatList(list);
  localStorage.setItem(sessionKey(id), JSON.stringify([]));
  return id;
}

function dedupeMessages(msgs: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const m of msgs) map.set(m.id, m); // last write wins
  return Array.from(map.values());
}

function fromServer(m: ServerMessage): ChatMessage {
  return {
    id: m.message_id,
    role: m.role,
    content: m.content,
    citations: m.citations || [],
    mode: m.mode || undefined,
    createdAt: m.created_at ? Date.parse(m.created_at) : undefined,
  };
}

function metaFrom(row: ConversationRow | ConversationDetail): ConversationMeta {
  const state = row.state ?? (row.archived_at ? "archived" : "active");
  return {
    title: row.title,
    count: row.message_count,
    when: row.last_message_at ? Date.parse(row.last_message_at) : undefined,
    state,
    archivedAt: row.archived_at ? Date.parse(row.archived_at) : undefined,
    legalHold: Boolean(row.legal_hold),
    ...("archive" in row && row.archive !== undefined ? { archive: row.archive } : {}),
  };
}

// =============================================================
//  CHAT STORE
// =============================================================
export function useChatStore() {
  const hydrationBlock = useRef(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatList, setChatList] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  // server metadata keyed by *local* session id
  const [conversationMeta, setConversationMeta] = useState<Record<string, ConversationMeta>>({});
  // what the organization does with these chats (from the list route); null until synced
  const [retention, setRetention] = useState<RetentionInfo | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const lockInput = useCallback(() => setIsSending(true), []);
  const unlockInput = useCallback(() => setIsSending(false), []);

  // -------------------------------------------------------------
  // SERVER SYNC
  // -------------------------------------------------------------

  /**
   * Pull a session's messages from the server and refresh the cache.
   * A thread the server no longer has (deleted elsewhere) drops its
   * mapping and keeps whatever the cache holds. Never throws.
   */
  const hydrateFromServer = useCallback(async (id: string) => {
    const conversationId = getConversationId(id);
    if (!conversationId) return;
    try {
      const detail = await getConversation(conversationId);
      // an archived thread has no messages any more: the cache follows, the summary stands in
      const msgs = detail.state === "archived" ? [] : dedupeMessages(detail.messages.map(fromServer));
      saveChatLocal(id, msgs);
      setConversationMeta((prev) => ({ ...prev, [id]: metaFrom(detail) }));
      if (sessionIdRef.current === id) {
        setMessages(msgs);
        setIsSending(false);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        // deleted elsewhere: the server is the source of truth, so the cache goes too
        forgetConversation(id);
        localStorage.setItem(sessionKey(id), JSON.stringify([]));
        setConversationMeta((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (sessionIdRef.current === id) setMessages([]);
      }
      // 401/403/network: memory is off for this role or the server is away; the cache stands
    }
  }, []);

  /**
   * Reconcile the sidebar with the server: every server thread gets a
   * local entry (threads started on another device appear), and a local
   * entry whose server thread is gone (deleted on another device) is
   * dropped with its cache. Local-only sessions with no server thread
   * are left alone. Quiet when the role cannot use saved conversations
   * or memory is off.
   */
  const SYNC_LIMIT = 200;
  const syncFromServer = useCallback(async () => {
    let rows: ConversationRow[];
    try {
      const res = await listConversations({ state: "all", limit: SYNC_LIMIT });
      rows = res.conversations;
      setRetention(res.retention ?? null);
    } catch {
      return;
    }
    const map = loadConvMap();
    const byConv = new Map(Object.entries(map).map(([local, conv]) => [conv, local]));
    let list = loadChatList();
    const meta: Record<string, ConversationMeta> = {};
    let changed = false;

    for (const row of rows) {
      let local = byConv.get(row.conversation_id);
      if (!local) {
        local = crypto.randomUUID();
        map[local] = row.conversation_id;
        list.push(local);
        localStorage.setItem(sessionKey(local), JSON.stringify([]));
        changed = true;
      }
      // a thread archived since it was cached here: its messages are gone on the server, so here too
      if (row.state === "archived" && readSessionMessages(local).length) {
        saveChatLocal(local, []);
        if (sessionIdRef.current === local) setMessages([]);
      }
      meta[local] = metaFrom(row);
    }

    // only trust absence when the list was not cut off
    if (rows.length < SYNC_LIMIT) {
      const serverIds = new Set(rows.map((r) => r.conversation_id));
      const stale = list.filter((local) => map[local] && !serverIds.has(map[local]));
      for (const local of stale) {
        delete map[local];
        localStorage.removeItem(sessionKey(local));
        changed = true;
      }
      if (stale.length) {
        list = list.filter((local) => !stale.includes(local));
        if (sessionIdRef.current && stale.includes(sessionIdRef.current)) {
          // the thread on screen was deleted elsewhere: start fresh
          const id = crypto.randomUUID();
          list.unshift(id);
          localStorage.setItem(sessionKey(id), JSON.stringify([]));
          localStorage.setItem(CURRENT_KEY(), id);
          sessionIdRef.current = id;
          setSessionId(id);
          setMessages([]);
        }
      }
    }

    if (changed) {
      saveConvMap(map);
      saveChatList(list);
      setChatList(list);
    }
    setConversationMeta(meta);
  }, []);

  // -------------------------------------------------------------
  // INITIALIZE SESSION
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydrationBlock.current) return;
    hydrationBlock.current = true;

    purgeLegacyLocalChats();

    const saved = localStorage.getItem(CURRENT_KEY());

    if (saved) {
      setSessionId(saved);
      setMessages(dedupeMessages(readSessionMessages(saved)));
      setChatList(loadChatList());
      setIsSending(false);
      return;
    }

    const id = createLocalSession();
    setSessionId(id);
    setMessages([]);
    setChatList(loadChatList());
    setIsSending(false);
    localStorage.setItem(CURRENT_KEY(), id);
  }, []);

  useEffect(() => {
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem(CURRENT_KEY(), sessionId);
      setIsSending(false);
    }
  }, [sessionId]);

  // -------------------------------------------------------------
  // ENSURE SESSION
  // -------------------------------------------------------------
  const ensureSession = useCallback(() => {
    if (sessionId) return sessionId;

    const saved = localStorage.getItem(CURRENT_KEY());
    if (saved) {
      setSessionId(saved);
      setMessages(dedupeMessages(readSessionMessages(saved)));
      setIsSending(false);
      return saved;
    }

    const id = createLocalSession();
    setSessionId(id);
    setMessages([]);
    setChatList(loadChatList());
    setIsSending(false);
    localStorage.setItem(CURRENT_KEY(), id);
    return id;
  }, [sessionId]);

  // -------------------------------------------------------------
  // CREATE / SWITCH / DELETE SESSIONS
  // -------------------------------------------------------------
  const createNewSession = useCallback(() => {
    const id = createLocalSession();
    setSessionId(id);
    setMessages([]);
    setChatList(loadChatList());
    setIsSending(false);
    localStorage.setItem(CURRENT_KEY(), id);
    return id;
  }, []);

  const loadSessionMessages = useCallback(
    (id: string) => {
      const msgs = readSessionMessages(id);
      setMessages(dedupeMessages(msgs));
      setIsSending(false);
      void hydrateFromServer(id);
      return msgs;
    },
    [hydrateFromServer]
  );

  const switchSession = useCallback(
    (id: string) => {
      setSessionId(id);
      sessionIdRef.current = id;
      setMessages(dedupeMessages(readSessionMessages(id)));
      setIsSending(false);
      localStorage.setItem(CURRENT_KEY(), id);
      void hydrateFromServer(id);
    },
    [hydrateFromServer]
  );

  /**
   * Summarise and archive one chat now, ahead of the retention period.
   * The server writes the summary and removes the messages; the cache
   * follows on the reload. Not reversible.
   */
  const archiveSession = useCallback(
    async (id: string): Promise<ArchiveOutcome> => {
      const conversationId = getConversationId(id);
      if (!conversationId) return { archived: false, message: "This chat isn't saved on the server, so there is nothing to archive." };
      try {
        const res = await archiveConversationNow(conversationId);
        await hydrateFromServer(id);
        return { archived: true, archive: res.archive ?? null };
      } catch (err: unknown) {
        return { archived: false, message: (err as Error)?.message || "Couldn't archive this chat." };
      }
    },
    [hydrateFromServer]
  );

  /**
   * Delete one chat. The server goes first, so a chat on legal hold stays
   * here too and the caller can say why; a chat the server no longer has
   * (404) or cannot be reached for is still removed from this device, as
   * before. Resolves with the server's receipt when it gave one.
   */
  const deleteSession = useCallback(
    async (id: string): Promise<DeleteOutcome> => {
      const conversationId = getConversationId(id);
      let receipt: PurgeReceipt | null = null;
      if (conversationId) {
        try {
          const res = await deleteConversation(conversationId);
          receipt = res.receipt ?? null;
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status;
          if (status === 409) {
            return { deleted: false, held: true, message: (err as Error).message || "This chat is on hold and can't be deleted." };
          }
          // 404 or network: the local copy goes either way
        }
        forgetConversation(id);
      }
      localStorage.removeItem(sessionKey(id));
      const remaining = loadChatList().filter((x) => x !== id);
      saveChatList(remaining);
      setChatList(remaining);
      setConversationMeta((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (id === sessionId) {
        const next = remaining.find(
          (x) => readSessionMessages(x).length > 0 || getConversationId(x)
        );
        if (next) {
          switchSession(next);
        } else {
          createNewSession();
        }
      }
      return { deleted: true, receipt };
    },
    [sessionId, switchSession, createNewSession]
  );

  /**
   * Delete every chat. Chats the server refuses (legal hold) stay in the
   * list with their cache; everything else goes, and the receipts are
   * summed for the notice.
   */
  const clearAllSessions = useCallback(async (): Promise<ClearOutcome> => {
    const map = loadConvMap();
    const list = loadChatList();
    const out: ClearOutcome = { deleted: 0, held: 0, messages: 0, memoriesKept: 0 };
    const kept: string[] = [];
    for (const id of list) {
      const conversationId = map[id];
      if (conversationId) {
        try {
          const res = await deleteConversation(conversationId);
          out.messages += res.receipt?.messages ?? 0;
          out.memoriesKept += res.receipt?.memories_kept?.length ?? 0;
        } catch (err: unknown) {
          if ((err as { status?: number })?.status === 409) {
            out.held += 1;
            kept.push(id);
            continue;
          }
        }
        delete map[id];
      }
      localStorage.removeItem(sessionKey(id));
      out.deleted += 1;
    }
    saveConvMap(map);
    saveChatList(kept);
    setConversationMeta((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => kept.includes(id))));
    setChatList(kept);
    createNewSession();
    return out;
  }, [createNewSession]);

  // -------------------------------------------------------------
  // MESSAGES
  // -------------------------------------------------------------
  const activeAssistantId = useRef<string | null>(null);

  const appendMessageToLocal = useCallback(
    (role: ChatMessage["role"], text: string) => {
      const sid = ensureSession();
      if (!sid) return;

      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        content: text,
        createdAt: Date.now(),
      };

      setMessages((prev) => {
        const updated = dedupeMessages([...prev, newMsg]);
        saveChatLocal(sid, updated);
        return updated;
      });

      lockInput();
    },
    [ensureSession, lockInput]
  );

  const lastTurnRef = useRef<string>("");

  const appendAssistantMessage = useCallback(
    (text: string, extras: { citations?: Citation[]; mode?: ChatMessage["mode"] } = {}) => {
      const sid = ensureSession();
      if (!sid) return;

      if (text.trim().length === 0 && lastTurnRef.current.trim().length === 0)
        return;

      lastTurnRef.current = crypto.randomUUID();

      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        citations: extras.citations || [],
        mode: extras.mode,
        createdAt: Date.now(),
      };

      activeAssistantId.current = newMsg.id;

      setMessages((prev) => {
        const updated = dedupeMessages([...prev, newMsg]);
        saveChatLocal(sid, updated);
        return updated;
      });

      unlockInput();
      setIsSending(false);
    },
    [ensureSession, unlockInput]
  );

  const startAssistantMessage = useCallback(() => {
    const sid = ensureSession();
    const id = crypto.randomUUID();
    activeAssistantId.current = id;

    setMessages((prev) => {
      const updated = dedupeMessages([
        ...prev,
        { id, role: "assistant", content: "", createdAt: Date.now() },
      ]);
      saveChatLocal(sid, updated);
      return updated;
    });

    return id;
  }, [ensureSession]);

  const updateAssistantMessage = useCallback(
    (token: string) => {
      const sid = ensureSession();
      if (!sid) return;

      const targetId = activeAssistantId.current;
      if (!targetId) return;

      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === targetId
            ? { ...msg, content: (msg.content || "") + token }
            : msg
        );
        saveChatLocal(sid, updated);
        return updated;
      });
    },
    [ensureSession]
  );

  // Replace a streamed (in-progress) assistant message with its final text + citations.
  const finalizeAssistantMessage = useCallback(
    (id: string, text: string, extras: { citations?: Citation[]; mode?: ChatMessage["mode"] } = {}) => {
      const sid = ensureSession();
      if (!sid) return;
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === id
            ? { ...msg, content: text, citations: extras.citations || [], mode: extras.mode }
            : msg
        );
        saveChatLocal(sid, updated);
        return updated;
      });
      activeAssistantId.current = null;
      unlockInput();
      setIsSending(false);
    },
    [ensureSession, unlockInput]
  );

  // Auto-unlock once an assistant turn lands
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") setIsSending(false);
    }
  }, [messages]);

  return {
    sessionId,
    messages,
    chatList,
    conversationMeta,

    createNewSession,
    loadSessionMessages,
    switchSession,
    deleteSession,
    archiveSession,
    clearAllSessions,
    hydrateFromServer,
    syncFromServer,
    retention,

    appendMessageToLocal,
    appendAssistantMessage,
    startAssistantMessage,
    updateAssistantMessage,
    finalizeAssistantMessage,

    isSending,
    lockInput,
    unlockInput,
  };
}

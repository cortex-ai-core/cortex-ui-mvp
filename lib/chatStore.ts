"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import type { Citation } from "@/lib/citations";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
  citations?: Citation[];
  mode?: "retrieval" | "document" | "private";
  createdAt?: number;
};

export type ToneMode =
  | "neutral"
  | "king"
  | "ceo"
  | "advisory"
  | "recruiting"
  | "cybersecurity"
  | "datamanagement"
  | "ventures";

const LIST_KEY = "cortex_chat_list";
const CURRENT_KEY = "cortex_current_session";
const TONE_KEY = "cortex_tone_mode";
const sessionKey = (id: string) => `cortex_chat_${id}`;

// =============================================================
//  LOCAL STORAGE HELPERS
// =============================================================
function loadChatList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatList(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
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

// =============================================================
//  CHAT STORE
// =============================================================
export function useChatStore() {
  const hydrationBlock = useRef(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatList, setChatList] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const lockInput = useCallback(() => setIsSending(true), []);
  const unlockInput = useCallback(() => setIsSending(false), []);

  // -------------------------------------------------------------
  // TONE MODE
  // -------------------------------------------------------------
  const [toneMode, setToneMode] = useState<ToneMode>(() => {
    if (typeof window === "undefined") return "neutral";
    return (localStorage.getItem(TONE_KEY) as ToneMode) || "neutral";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TONE_KEY, toneMode);
    }
  }, [toneMode]);

  // -------------------------------------------------------------
  // INITIALIZE SESSION
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydrationBlock.current) return;
    hydrationBlock.current = true;

    const saved = localStorage.getItem(CURRENT_KEY);

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
    localStorage.setItem(CURRENT_KEY, id);
  }, []);

  useEffect(() => {
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem(CURRENT_KEY, sessionId);
      setIsSending(false);
    }
  }, [sessionId]);

  // -------------------------------------------------------------
  // ENSURE SESSION
  // -------------------------------------------------------------
  const ensureSession = useCallback(() => {
    if (sessionId) return sessionId;

    const saved = localStorage.getItem(CURRENT_KEY);
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
    localStorage.setItem(CURRENT_KEY, id);
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
    localStorage.setItem(CURRENT_KEY, id);
    return id;
  }, []);

  const loadSessionMessages = useCallback((id: string) => {
    const msgs = readSessionMessages(id);
    setMessages(dedupeMessages(msgs));
    setIsSending(false);
    return msgs;
  }, []);

  const switchSession = useCallback((id: string) => {
    setSessionId(id);
    setMessages(dedupeMessages(readSessionMessages(id)));
    setIsSending(false);
    localStorage.setItem(CURRENT_KEY, id);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      localStorage.removeItem(sessionKey(id));
      const remaining = loadChatList().filter((x) => x !== id);
      saveChatList(remaining);
      setChatList(remaining);

      if (id === sessionId) {
        const next = remaining.find(
          (x) => readSessionMessages(x).length > 0
        );
        if (next) {
          switchSession(next);
        } else {
          createNewSession();
        }
      }
    },
    [sessionId, switchSession, createNewSession]
  );

  const clearAllSessions = useCallback(() => {
    for (const id of loadChatList()) {
      localStorage.removeItem(sessionKey(id));
    }
    saveChatList([]);
    createNewSession();
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

    createNewSession,
    loadSessionMessages,
    switchSession,
    deleteSession,
    clearAllSessions,

    appendMessageToLocal,
    appendAssistantMessage,
    startAssistantMessage,
    updateAssistantMessage,
    finalizeAssistantMessage,

    isSending,
    lockInput,
    unlockInput,

    toneMode,
    setToneMode,
  };
}

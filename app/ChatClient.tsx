"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useChatStore,
  readSessionMessages,
  getConversationId,
  setConversationId,
  type ToneMode,
  type ChatMessage,
} from "@/lib/chatStore";
import MessageBubble from "@/components/MessageBubble";
import { sendChat } from "@/lib/sendChat";
import DocumentsPanel, {
  type PendingUpload,
  type StagedFile,
} from "@/components/DocumentsPanel";
import SourcePanel from "@/components/SourcePanel";
import SettingsLanding from "@/components/settings/SettingsLanding";
import UserSettings from "@/components/settings/UserSettings";
import UserManagement from "@/components/settings/UserManagement";
import OrganizationAdministration from "@/components/settings/OrganizationAdministration";
import RoleManagement from "@/components/settings/RoleManagement";
import { useDialog } from "@/components/Dialog";
import { useDensity } from "@/lib/useDensity";
import {
  listDocuments,
  listDocumentTypes,
  uploadDocument,
  isInProgress,
  type DocumentRow,
  type DocumentType,
  type ParserHealth,
} from "@/lib/documentsApi";
import type { Citation, ChatMeta } from "@/lib/citations";
import { hasPermission } from "@/lib/auth/hasPermission";
import {
  IconPlus,
  IconSend,
  IconTrash,
  IconLock,
  IconUnlock,
  IconLogout,
  IconX,
  IconDoc,
  IconFolder,
  IconChat,
  IconSettings,
  IconMenu,
  IconPaperclip,
  IconRefresh,
} from "@/components/icons";

// -------------------------------------------------------------
// CONSTANTS
// -------------------------------------------------------------
const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8080";

const personaMap: Record<string, string> = {
  core: "CEO",
  advisory: "Advisory",
  cybersecurity: "Cyber",
  recruiting: "Recruiting",
  datamanagement: "Data",
  ventures: "Ventures",
};

const workspaceLabel: Record<string, string> = {
  core: "Core",
  hawaii: "Hawaii",
  advisory: "Advisory",
  cybersecurity: "Cybersecurity",
  recruiting: "Recruiting",
  datamanagement: "Data Management",
  ventures: "Ventures",
};

const roleLabel: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
  client: "Client",
};

const SUGGESTIONS = [
  "Summarize the key themes across the uploaded documents",
  "What action items or next steps are mentioned in the materials?",
  "Draft a one-page executive brief from the current knowledge base",
  "Compare the candidates whose resumes are on file",
];

const ACCEPTED = ".txt,.md,.docx,.csv,.json";

type View =
  | "chat"
  | "documents"
  | "settings"
  | "user-settings"
  | "user-management"
  | "organization-administration"
  | "role-management";
type EphemeralFile = { name: string; content: string };
const VIEW_TITLES: Record<View, string> = {
  chat: "Chat",
  documents: "My documents",
  settings: "Settings",
  "user-settings": "User Settings",
  "user-management": "User Management",
  "organization-administration": "Organization Administration",
  "role-management": "Role Management",
};

// -------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------
export default function ChatClient({ user }: { user: any }) {
  const router = useRouter();
  const dialog = useDialog();

  const userId: string = user?.userId ?? "";
  const email: string = user?.email ?? "";
  const role: string = user?.role ?? "";
  // namespaceId is the key sent to the server; namespace is the display name.
  const NAMESPACE_ID: string = user?.namespaceId ?? "";
  const NAMESPACE: string = user?.namespace ?? "";

  const persona = personaMap[NAMESPACE] || "General";
  const workspace = workspaceLabel[NAMESPACE] || NAMESPACE || "Workspace";

  const canUploadPersistent = hasPermission(role, "upload_persistent");
  const canAttach = hasPermission(role, "upload_ephemeral");
  const canDelete = hasPermission(role, "delete_documents");

  const {
    sessionId,
    messages,
    chatList,
    conversationMeta,
    createNewSession,
    loadSessionMessages,
    switchSession,
    deleteSession,
    clearAllSessions,
    syncFromServer,
    appendMessageToLocal,
    appendAssistantMessage,
    startAssistantMessage,
    updateAssistantMessage,
    finalizeAssistantMessage,
    isSending,
    lockInput,
    unlockInput,
    toneMode,
  } = useChatStore();

  const [view, setView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { density, setDensity } = useDensity();

  const [input, setInput] = useState("");
  const [ephemeralFiles, setEphemeralFiles] = useState<EphemeralFile[]>([]);
  const [privateMode, setPrivateMode] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Private chats live only in React state: never written to storage,
  // never listed under Previous chats, gone on refresh.
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [privateSending, setPrivateSending] = useState(false);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [parserHealth, setParserHealth] = useState<ParserHealth | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);

  // Source panel: the citation being inspected + its siblings from the same answer
  const [activeCitation, setActiveCitation] = useState<{
    citation: Citation;
    all: Citation[];
  } | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const attachRef = useRef<HTMLInputElement | null>(null);
  const sessionInitialized = useRef(false);

  const visibleMessages = privateMode ? privateMessages : messages;
  const busy = isSending || privateSending;

  // -----------------------------------------------------------
  // SESSION BOOTSTRAP (unchanged behaviour)
  // -----------------------------------------------------------
  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    if (!sessionId) {
      const id = createNewSession();
      loadSessionMessages(id);
    } else {
      loadSessionMessages(sessionId);
    }
    // threads saved on the server (design doc D7): list them, then the
    // current one is refreshed by loadSessionMessages above
    void syncFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // -----------------------------------------------------------
  // AUTH HELPERS
  // -----------------------------------------------------------
  const signOut = useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch {}
    router.replace("/login");
  }, [router]);

  // -----------------------------------------------------------
  // DOCUMENTS
  // -----------------------------------------------------------
  // silent=true refreshes without the loading indicator (used by polling)
  const fetchDocuments = useCallback(
    async (silent = false) => {
      if (!silent) setDocsLoading(true);
      try {
        const data = await listDocuments();
        setDocuments(data.documents || []);
        setParserHealth(data.parser || null);
        setDocsError(null);
      } catch (err: any) {
        if (err?.status === 401) {
          signOut();
          return;
        }
        setDocsError("Couldn't load documents. Is the Cortéx server running?");
      } finally {
        if (!silent) setDocsLoading(false);
      }
    },
    [signOut],
  );

  const fetchTypes = useCallback(async () => {
    try {
      const data = await listDocumentTypes();
      setDocumentTypes(data.types || []);
    } catch {
      /* types are optional; the upload form works without them */
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes]);

  // While anything is being read or learned, poll the list so the
  // progress cards move. Stops on its own once everything settles.
  const anyActive = documents.some(isInProgress);
  useEffect(() => {
    if (!anyActive) return;
    const timer = setInterval(() => fetchDocuments(true), 1500);
    return () => clearInterval(timer);
  }, [anyActive, fetchDocuments]);

  // Upload lives here, not in the panel, so navigating away mid-upload
  // doesn't lose the in-flight cards.
  const handleFiles = useCallback(
    (items: StagedFile[]) => {
      setView("documents");
      for (const { file, meta } of items) {
        const localId = crypto.randomUUID();
        setPending((prev) => [
          ...prev,
          {
            id: localId,
            file_name: file.name,
            display_name: meta.display_name || null,
            byte_size: file.size,
            progress: 0,
          },
        ]);

        uploadDocument(file, meta, (fraction) =>
          setPending((prev) =>
            prev.map((u) =>
              u.id === localId ? { ...u, progress: fraction } : u,
            ),
          ),
        )
          .then(async (res) => {
            await fetchDocuments(true);
            if (res.duplicate) {
              setPending((prev) =>
                prev.map((u) =>
                  u.id === localId
                    ? {
                        ...u,
                        progress: 1,
                        message: res.message || "Already in this workspace.",
                      }
                    : u,
                ),
              );
            } else {
              setPending((prev) => prev.filter((u) => u.id !== localId));
            }
          })
          .catch((err: any) => {
            if (err?.status === 401) {
              signOut();
              return;
            }
            setPending((prev) =>
              prev.map((u) =>
                u.id === localId
                  ? { ...u, error: err?.message || "Upload failed." }
                  : u,
              ),
            );
          });
      }
    },
    [fetchDocuments, signOut],
  );

  // -----------------------------------------------------------
  // SCROLL
  // -----------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
    return () => clearTimeout(t);
  }, [visibleMessages, isThinking]);

  // -----------------------------------------------------------
  // COMPOSER
  // -----------------------------------------------------------
  const resizeComposer = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  const focusComposer = () => {
    setView("chat");
    setSidebarOpen(false);
    setTimeout(() => composerRef.current?.focus(), 0);
  };

  async function handleAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []) as File[];
    if (attachRef.current) attachRef.current.value = "";
    if (!files.length) return;

    if (!canAttach) {
      setNotice("Your role can't attach files.");
      return;
    }

    const added: EphemeralFile[] = [];
    const skipped: string[] = [];

    for (const f of files) {
      let text = "";
      try {
        if (f.name.toLowerCase().endsWith(".docx")) {
          const mammoth = await import("mammoth");
          const buf = await f.arrayBuffer();
          text = (await mammoth.extractRawText({ arrayBuffer: buf })).value;
        } else {
          text = await f.text();
        }
      } catch {
        skipped.push(f.name);
        continue;
      }

      if (!text.trim()) {
        skipped.push(f.name);
        continue;
      }

      added.push({ name: f.name, content: text });
    }

    if (added.length) {
      setEphemeralFiles((prev) => {
        const names = new Set(prev.map((p) => p.name));
        return [...prev, ...added.filter((a) => !names.has(a.name))];
      });
    }

    setNotice(skipped.length ? `Couldn't read: ${skipped.join(", ")}` : null);
  }

  function removeAttachment(name: string) {
    setEphemeralFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // -----------------------------------------------------------
  // PRIVATE MODE
  // -----------------------------------------------------------
  async function leavePrivateMode(): Promise<boolean> {
    if (privateMessages.length > 0) {
      const ok = await dialog.confirm({
        title: "Leave private mode?",
        message:
          "This private chat isn't saved anywhere and will be discarded.",
        confirmLabel: "Leave and discard",
        danger: true,
      });
      if (!ok) return false;
    }
    setPrivateMessages([]);
    setEphemeralFiles([]);
    setPrivateMode(false);
    setNotice(null);
    return true;
  }

  function togglePrivateMode() {
    if (privateMode) {
      leavePrivateMode();
      return;
    }
    setPrivateMessages([]);
    setPrivateMode(true);
    setNotice(null);
    setView("chat");
  }

  async function sendPrivate(text: string) {
    const pushPrivate = (role: ChatMessage["role"], content: string) =>
      setPrivateMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role, content, createdAt: Date.now() },
      ]);

    pushPrivate("user", text);
    setPrivateSending(true);
    setIsThinking(true);

    // Private chats stream too, but only ever into React state.
    let streamingId: string | null = null;

    try {
      await sendChat(
        `private-${crypto.randomUUID()}`,
        text,
        (finalText: string, meta?: ChatMeta) => {
          const body =
            finalText || "Cortéx returned an empty response. Try rephrasing.";
          const final = {
            citations: meta?.citations || [],
            mode: "private" as const,
          };
          if (streamingId) {
            const id = streamingId;
            setPrivateMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, content: body, ...final } : m,
              ),
            );
          } else {
            setPrivateMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: body,
                ...final,
                createdAt: Date.now(),
              },
            ]);
          }
        },
        (delta: string) => {
          if (!streamingId) {
            streamingId = crypto.randomUUID();
            const id = streamingId;
            setIsThinking(false);
            setPrivateMessages((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                content: delta,
                mode: "private",
                createdAt: Date.now(),
              },
            ]);
            return;
          }
          const id = streamingId;
          setPrivateMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, content: m.content + delta } : m,
            ),
          );
        },
        {
          namespaceId: NAMESPACE_ID,
          privateMode: true,
          ephemeralContext: ephemeralFiles.map((f) => f.content).join("\n\n"),
          toneMode,
          identity: { userId, role, namespaceId: NAMESPACE_ID },
        },
      );
    } catch {
      pushPrivate(
        "assistant",
        "Cortéx couldn't answer that just now. Please try again in a moment.",
      );
    } finally {
      setPrivateSending(false);
      setIsThinking(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;

    if (privateMode) {
      if (ephemeralFiles.length === 0) {
        setNotice(
          "Private chats answer only from files you attach. Attach a file first.",
        );
        return;
      }
      setNotice(null);
      setInput("");
      await sendPrivate(text);
      return;
    }

    if (!sessionId) return;

    setNotice(null);
    setInput("");
    appendMessageToLocal("user", text);
    lockInput();
    setIsThinking(true);

    // Streaming: the assistant bubble is created on the first token and
    // replaced with the formatted, cited answer when the stream finishes.
    let streamingId: string | null = null;

    try {
      await sendChat(
        sessionId,
        text,
        (finalText: string, meta?: ChatMeta) => {
          const body =
            finalText || "Cortéx returned an empty response. Try rephrasing.";
          if (streamingId) {
            finalizeAssistantMessage(streamingId, body, {
              citations: meta?.citations || [],
              mode: meta?.mode,
            });
          } else {
            appendAssistantMessage(body, {
              citations: meta?.citations || [],
              mode: meta?.mode,
            });
          }
        },
        (delta: string) => {
          if (!streamingId) {
            streamingId = startAssistantMessage();
            setIsThinking(false);
          }
          updateAssistantMessage(delta);
        },
        {
          namespaceId: NAMESPACE_ID,
          privateMode,
          ephemeralContext: ephemeralFiles.map((f) => f.content).join("\n\n"),
          toneMode,
          identity: { userId, role, namespaceId: NAMESPACE_ID },
          // continue the server-side thread for this session, or let the server start one
          conversationId: getConversationId(sessionId),
          onConversation: (id) => setConversationId(sessionId, id),
        },
      );
    } catch {
      appendAssistantMessage(
        "Cortéx couldn't answer that just now. Please try again in a moment.",
      );
    } finally {
      unlockInput();
      setIsThinking(false);
    }
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function startNewChat() {
    if (privateMode) {
      if (!(await leavePrivateMode())) return;
    } else if (messages.length > 0) {
      // Reuse the current session if it's still empty.
      createNewSession();
    }
    setEphemeralFiles([]);
    setNotice(null);
    focusComposer();
  }

  // -----------------------------------------------------------
  // PREVIOUS CHATS
  // -----------------------------------------------------------
  const previews = useMemo(() => {
    return chatList
      .map((id) => {
        const msgs = id === sessionId ? messages : readSessionMessages(id);
        const meta = conversationMeta[id];
        const firstUser = msgs.find((m) => m.role === "user");
        const title =
          firstUser?.content?.replace(/\s+/g, " ").trim() || meta?.title || "";
        return {
          id,
          title: title ? title.slice(0, 70) : "New chat",
          // a thread synced from the server but not opened here yet has no cached messages
          count: msgs.length || meta?.count || 0,
          when: msgs[msgs.length - 1]?.createdAt ?? meta?.when,
        };
      })
      .filter((p) => p.count > 0 || p.id === sessionId)
      // newest first; a fresh, still-empty chat is the newest thing there is
      .sort((a, b) => {
        const key = (p: { count: number; when?: number }) =>
          p.count === 0 ? Number.POSITIVE_INFINITY : p.when || 0;
        return key(b) - key(a);
      });
  }, [chatList, sessionId, messages, conversationMeta]);

  const formatWhen = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const initial = (email || userId || "?").charAt(0).toUpperCase();

  // -----------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------
  const navItem = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    badge?: React.ReactNode,
  ) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition ${
        active
          ? "bg-white/12 text-white"
          : "text-white/75 hover:bg-white/8 hover:text-white"
      }`}
    >
      <span className="text-white/80">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge}
    </button>
  );

  return (
    <div
      data-density={density}
      className="flex h-screen w-full overflow-hidden bg-surface"
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col bg-brand-900 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/sollucio-logo.png"
              alt="Sollucio Partners"
              width={155}
              height={93}
              priority
              className="logo-invert h-9 w-auto"
            />
            <div className="h-6 w-px bg-white/20" />
            <div>
              <div className="text-[15px] font-semibold leading-none tracking-tight">
                Cortéx
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/55">
                {workspace}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* New chat */}
        <div className="px-4">
          <button
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-semibold text-brand-900 shadow-sm transition hover:bg-brand-50"
          >
            <IconPlus size={16} />
            New chat
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-4 space-y-0.5 px-3">
          {navItem(
            view === "chat",
            () => {
              setView("chat");
              setSidebarOpen(false);
            },
            <IconChat />,
            "Chat",
          )}
          {navItem(
            view === "documents",
            () => {
              setView("documents");
              setSidebarOpen(false);
            },
            <IconFolder />,
            "My documents",
            <span className="flex items-center gap-1.5">
              {anyActive && (
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400"
                  aria-label="Documents are being processed"
                />
              )}
              <span className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                {documents.filter((d) => d.status === "ready").length}
              </span>
            </span>,
          )}
          {navItem(
            view === "settings" ||
              view.endsWith("settings") ||
              view.includes("management") ||
              view.includes("administration"),
            () => {
              setView("settings");
              setSidebarOpen(false);
            },
            <IconSettings />,
            "Settings",
          )}
        </nav>

        {/* Previous chats */}
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Previous chats
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            {privateMode && (
              <div className="mb-1 flex items-center gap-2.5 rounded-xl bg-white/12 px-3 py-2">
                <IconLock size={14} className="shrink-0 text-brand-200" />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] text-white">
                    Private chat
                  </div>
                  <div className="text-[11px] text-white/45">
                    Not saved · cleared when you leave
                  </div>
                </div>
              </div>
            )}

            {previews.length === 0 && !privateMode && (
              <p className="px-2 py-3 text-[13px] text-white/50">
                Your conversations will show up here.
              </p>
            )}

            {previews.map((p) => {
              const active =
                !privateMode && p.id === sessionId && view === "chat";
              return (
                <div
                  key={p.id}
                  className={`group relative mb-0.5 flex items-center rounded-xl transition ${
                    active ? "bg-white/12" : "hover:bg-white/8"
                  }`}
                >
                  <button
                    onClick={async () => {
                      if (privateMode && !(await leavePrivateMode())) return;
                      if (p.id !== sessionId) switchSession(p.id);
                      focusComposer();
                    }}
                    className="flex min-w-0 flex-1 flex-col px-3 py-2 text-left"
                    title={p.title}
                  >
                    <span
                      className={`truncate text-[13.5px] ${
                        active ? "text-white" : "text-white/85"
                      }`}
                    >
                      {p.title}
                    </span>
                    <span className="mt-0.5 text-[11px] text-white/45">
                      {p.count === 0
                        ? "Empty"
                        : `${p.count} message${p.count === 1 ? "" : "s"}`}
                      {p.when ? ` · ${formatWhen(p.when)}` : ""}
                    </span>
                  </button>

                  {p.count > 0 && (
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: "Delete this chat?",
                          message:
                            "It will be removed from this device and from your saved conversations on the server.",
                          confirmLabel: "Delete",
                          danger: true,
                        });
                        if (ok) deleteSession(p.id);
                      }}
                      className="mr-1.5 rounded-lg p-1.5 text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100"
                      aria-label="Delete chat"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-400/30 text-[13px] font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">
                {email || userId}
              </div>
              <div className="truncate text-[11.5px] text-white/50">
                {roleLabel[role] || role} · {persona}
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-100 bg-white px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-muted hover:bg-brand-50 hover:text-brand-900 lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-brand-900">
              {VIEW_TITLES[view]}
            </h1>
          </div>

          {view === "chat" && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
                privateMode
                  ? "bg-brand-900 text-white"
                  : "bg-brand-50 text-brand-900"
              }`}
            >
              {privateMode ? <IconLock size={13} /> : <IconUnlock size={13} />}
              {privateMode
                ? "Private chat · not saved"
                : "Shared knowledge base"}
            </span>
          )}
        </header>

        {/* ---------------- CHAT VIEW ---------------- */}
        {view === "chat" && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="chat-column mx-auto max-w-3xl px-4 sm:px-6">
                {privateMode && visibleMessages.length === 0 && (
                  <div className="mt-6 sm:mt-12">
                    <div className="mx-auto max-w-xl rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white">
                          <IconLock size={18} />
                        </span>
                        <div>
                          <h2 className="text-lg font-semibold text-brand-900">
                            Private chat
                          </h2>
                          <p className="text-[13px] text-ink-muted">
                            Nothing in this conversation is saved.
                          </p>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-[13.5px] text-ink">
                        {[
                          "Messages aren't added to Previous chats or kept in this browser.",
                          "Nothing is stored on the server or used as memory for future answers.",
                          "Attached files are used for this chat only and are never added to the shared knowledge base.",
                          "The shared knowledge base isn't consulted. Answers come only from what you attach.",
                          "Leaving private mode, starting a new chat, or refreshing clears everything here.",
                        ].map((t) => (
                          <li key={t} className="flex gap-2.5">
                            <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>

                      <p className="mt-4 text-[13px] font-medium text-brand-900">
                        {ephemeralFiles.length > 0
                          ? `${ephemeralFiles.length} file${ephemeralFiles.length === 1 ? "" : "s"} attached. Ask your question below.`
                          : "Attach a file below to get started."}
                      </p>
                    </div>
                  </div>
                )}

                {privateMode && visibleMessages.length > 0 && (
                  <div className="mb-[var(--msg-gap)] flex items-center gap-2.5 rounded-xl border border-brand-100 bg-white px-4 py-2 text-[12.5px] text-ink-muted shadow-sm">
                    <IconLock size={13} className="shrink-0 text-brand-700" />
                    <span>
                      <span className="font-semibold text-brand-900">
                        Private chat.
                      </span>{" "}
                      Not saved, not remembered. Cleared when you leave private
                      mode or refresh.
                    </span>
                  </div>
                )}

                {!privateMode && messages.length === 0 && (
                  <div className="mt-8 flex flex-col items-center text-center sm:mt-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-xl font-bold text-white shadow-card">
                      C
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight text-brand-900">
                      How can Cortéx help?
                    </h2>
                    <p className="mt-2 max-w-md text-[14.5px] text-ink-muted">
                      Ask anything about the {workspace} workspace. Answers are
                      grounded in the documents your team has shared.
                    </p>

                    <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setInput(s);
                            focusComposer();
                          }}
                          className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-left text-[13.5px] text-ink transition hover:border-brand-500 hover:bg-brand-50/60"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="msg-list">
                  {visibleMessages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      role={m.role}
                      content={m.content}
                      sources={m.sources || []}
                      citations={m.citations || []}
                      onCite={(c) =>
                        setActiveCitation({
                          citation: c,
                          all: m.citations || [],
                        })
                      }
                    />
                  ))}

                  {isThinking && (
                    <div className="flex items-center">
                      <div className="msg-avatar hidden shrink-0 items-center justify-center rounded-full bg-brand-900 font-bold text-white sm:flex">
                        C
                      </div>
                      <div className="msg-bubble msg-bubble-assistant flex items-center gap-1.5 border border-brand-100 bg-white shadow-card">
                        <span className="dot h-2 w-2 rounded-full bg-brand-600" />
                        <span className="dot h-2 w-2 rounded-full bg-brand-600" />
                        <span className="dot h-2 w-2 rounded-full bg-brand-600" />
                      </div>
                    </div>
                  )}
                </div>

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Composer */}
            <div className="composer-shell shrink-0 border-t border-brand-100 bg-white px-4 sm:px-6">
              <div className="mx-auto max-w-3xl">
                {notice && (
                  <div
                    role="status"
                    className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900"
                  >
                    <span>{notice}</span>
                    <button
                      onClick={() => setNotice(null)}
                      className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
                      aria-label="Dismiss"
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                )}

                <div
                  className={`rounded-2xl border bg-white shadow-card transition focus-within:ring-4 ${
                    privateMode
                      ? "border-brand-700 focus-within:ring-brand-700/15"
                      : "border-brand-100 focus-within:border-brand-500 focus-within:ring-brand-600/12"
                  }`}
                >
                  {ephemeralFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-3 pt-3">
                      {ephemeralFiles.map((f) => (
                        <span
                          key={f.name}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1.5 text-[12.5px] font-medium text-brand-900"
                        >
                          <IconDoc size={13} />
                          <span className="truncate">{f.name}</span>
                          <button
                            onClick={() => removeAttachment(f.name)}
                            className="rounded p-0.5 text-brand-700 hover:bg-brand-100"
                            aria-label={`Remove ${f.name}`}
                          >
                            <IconX size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder={
                      privateMode
                        ? "Ask privately about your attached files…"
                        : "Ask Cortéx…"
                    }
                    disabled={busy}
                    className="composer-input block w-full resize-none bg-transparent px-4 pb-1 leading-relaxed text-ink outline-none placeholder:text-ink-muted/60 disabled:opacity-60"
                  />

                  <div className="flex items-center justify-between gap-2 px-2 pb-2">
                    <div className="flex items-center gap-1">
                      {canAttach && (
                        <>
                          <input
                            ref={attachRef}
                            type="file"
                            multiple
                            accept={ACCEPTED}
                            onChange={handleAttach}
                            className="sr-only"
                            id="attach-files"
                          />
                          <label
                            htmlFor="attach-files"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
                            title="Attach files for this conversation only. They aren't saved to the knowledge base."
                          >
                            <IconPaperclip size={15} />
                            Attach files
                          </label>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={togglePrivateMode}
                        aria-pressed={privateMode}
                        title={
                          privateMode
                            ? "Private mode is on. This chat isn't saved anywhere and answers only from your attached files."
                            : "Start a private chat: nothing is saved, nothing is remembered, and the shared knowledge base isn't used."
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${
                          privateMode
                            ? "bg-brand-900 text-white hover:bg-brand-800"
                            : "text-ink-muted hover:bg-brand-50 hover:text-brand-900"
                        }`}
                      >
                        {privateMode ? (
                          <IconLock size={14} />
                        ) : (
                          <IconUnlock size={14} />
                        )}
                        Private mode
                        <span
                          className={`ml-0.5 inline-block h-3.5 w-6 rounded-full p-0.5 transition ${
                            privateMode ? "bg-brand-400" : "bg-brand-200"
                          }`}
                          aria-hidden
                        >
                          <span
                            className={`block h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                              privateMode ? "translate-x-2.5" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={busy || !input.trim()}
                      aria-label="Send"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-200"
                    >
                      <IconSend size={17} />
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-center text-[11.5px] text-ink-muted/80">
                  Enter to send · Shift+Enter for a new line
                  {privateMode
                    ? " · Private chat: not saved, cleared when you leave"
                    : ""}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ---------------- SOURCE PANEL (citation drawer) ---------------- */}
        {view === "chat" && activeCitation && (
          <>
            <div
              className="fixed inset-0 z-30 bg-brand-950/30 sm:hidden"
              onClick={() => setActiveCitation(null)}
            />
            <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[420px] shadow-[0_0_40px_rgba(0,65,61,0.18)] sm:w-[380px]">
              <SourcePanel
                citation={activeCitation.citation}
                all={activeCitation.all}
                onSelect={(c) =>
                  setActiveCitation({ citation: c, all: activeCitation.all })
                }
                onClose={() => setActiveCitation(null)}
              />
            </div>
          </>
        )}

        {/* ---------------- DOCUMENTS VIEW ---------------- */}
        {view === "documents" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DocumentsPanel
              workspace={workspace}
              documents={documents}
              types={documentTypes}
              parser={parserHealth}
              pending={pending}
              loading={docsLoading}
              error={docsError}
              canUpload={canUploadPersistent}
              canDelete={canDelete}
              onFiles={handleFiles}
              onDismissPending={(id) =>
                setPending((prev) => prev.filter((u) => u.id !== id))
              }
              onRefresh={() => fetchDocuments()}
              onChanged={() => fetchDocuments(true)}
            />
          </div>
        )}

        {/* ---------------- SETTINGS VIEW ---------------- */}
        {view === "settings" && <SettingsLanding onNavigate={setView} />}

        {/* ---------------- USER SETTINGS VIEW ---------------- */}
        {view === "user-settings" && (
          <UserSettings
            userId={userId}
            email={email}
            role={roleLabel[role] || role}
            workspace={workspace}
            density={density}
            onDensityChange={setDensity}
            documentTypes={documentTypes}
            canManageDocumentTypes={canUploadPersistent}
            onDocumentTypesChanged={() => {
              fetchTypes();
              fetchDocuments(true);
            }}
            onClearHistory={async () => {
              const ok = await dialog.confirm({
                title: "Clear chat history?",
                message:
                  "Every chat saved in this browser and in your saved conversations on the server will be deleted. This can't be undone.",
                confirmLabel: "Clear history",
                danger: true,
              });
              if (ok) {
                clearAllSessions();
                setView("chat");
              }
            }}
            onSignOut={signOut}
            onBack={() => setView("settings")}
          />
        )}

        {/* ---------------- ADMINISTRATION VIEWS ---------------- */}
        {view === "user-management" && (
          <UserManagement onBack={() => setView("settings")} />
        )}

        {view === "organization-administration" && (
          <OrganizationAdministration
            role={role}
            currentOrganizationId={user?.organizationId ?? ""}
            currentNamespace={NAMESPACE}
            onBack={() => setView("settings")}
          />
        )}

        {view === "role-management" && (
          <RoleManagement
            role={role}
            currentOrganizationId={user?.organizationId ?? ""}
            onBack={() => setView("settings")}
          />
        )}
      </main>
    </div>
  );
}

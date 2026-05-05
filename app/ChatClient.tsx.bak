"use client";

import { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/lib/chatStore";
import MessageBubble from "@/components/MessageBubble";
import { sendChat } from "@/lib/sendChat";
import FileUploader from "@/components/FileUploader";
import * as mammoth from "mammoth";
import styles from "./ui.module.css";
import { hasPermission } from "@/lib/auth/hasPermission";

export default function ChatClient({ user }: { user: any }) {
  if (!user) console.warn("⚠ ChatClient mounted with no user");

  const userId = user?.userId;
  const role = user?.role;
  const NAMESPACE = user?.namespace;

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";

  const {
    sessionId,
    messages,
    createNewSession,
    loadSessionMessages,
    appendMessageToLocal,
    appendAssistantMessage,
    isSending,
    lockInput,
    unlockInput,
    toneMode,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [ephemeralFiles, setEphemeralFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sessionInitialized = useRef(false);

  const personaMap: Record<string, string> = {
    core: "CEO",
    advisory: "Advisory",
    cybersecurity: "Cyber",
    recruiting: "Recruiting",
    datamanagement: "Data",
    ventures: "Ventures",
  };

  const persona = personaMap[NAMESPACE] || "General";

  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    if (!sessionId) {
      const id = createNewSession();
      loadSessionMessages(id);
    } else {
      loadSessionMessages(sessionId);
    }
  }, [sessionId]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("❌ Failed to fetch documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const deleteDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${documentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok && res.status !== 404) {
        throw new Error("Delete failed");
      }

      setDocuments((prev) =>
        prev.filter((doc) => doc.document_id !== documentId)
      );

    } catch (err) {
      console.error("❌ Delete error:", err);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }, [messages]);

  async function handleEphemeralUpload(e: any) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles: { name: string; content: string }[] = [];

    for (const file of files) {
      const f = file as File; // ✅ FIXED

      let extractedText = "";

      if (f.name.toLowerCase().endsWith(".docx")) {
        const buf = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        extractedText = result.value;
      } else {
        extractedText = await f.text();
      }

      if (!extractedText.trim()) continue;

      newFiles.push({
        name: f.name,
        content: extractedText,
      });
    }

    if (!role || !hasPermission(role, "upload_ephemeral")) {
      alert("No permission");
      return;
    }

    setEphemeralFiles((prev) => [...prev, ...newFiles]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !sessionId) return;

    setInput("");
    appendMessageToLocal("user", text);
    lockInput();
    setIsThinking(true);

    try {
      await sendChat(
        sessionId,
        text,
        (finalText: string) => {
          appendAssistantMessage(finalText || "⚠ Empty response");
        },
        () => {},
        {
          namespace: NAMESPACE,
          mode: ephemeralFiles.length ? "ephemeral" : "persistent",
          ephemeralFiles,
          toneMode,
          identity: {
            userId,
            role,
            namespace: NAMESPACE,
          },
        }
      );

      setEphemeralFiles([]);
    } catch (err) {
      appendAssistantMessage("⚠️ Error");
    } finally {
      unlockInput();
      setIsThinking(false);
    }
  }

  const mode = ephemeralFiles.length ? "Ephemeral" : "Persistent";

  return (
    <div className="flex h-screen w-full bg-[#f7f7f8] overflow-hidden">

      <aside className={styles.sidebar}>
        <h1 className={styles.sidebarTitle}>Cortéx</h1>

        <button onClick={createNewSession} className={styles.newChatButton}>
          + New Chat
        </button>

        {(isSuperAdmin || isAdmin) && hasPermission(role, "upload_persistent") && (
          <FileUploader namespace={NAMESPACE} onUploadComplete={fetchDocuments} />
        )}

        {hasPermission(role, "upload_ephemeral") && (
          <div className={styles.section}>
            <div className={styles.ephemeralLabel}>Ephemeral Upload</div>

            <input
              type="file"
              multiple
              onChange={handleEphemeralUpload}
              className={styles.ephemeralInput}
            />

            {ephemeralFiles.length > 0 && (
              <div className={styles.ephemeralList}>
                {ephemeralFiles.map((f, i) => (
                  <div key={i} className={styles.ephemeralItem}>
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.section}>
          <h3>Documents</h3>

          {documents.length === 0 && (
            <div className={styles.emptyDocs}>No documents uploaded</div>
          )}

          {documents.map((doc) => (
            <div key={doc.document_id} className={styles.docItem}>
              <strong>{doc.file_name || "Unnamed File"}</strong>

              {role === "super_admin" && (
                <button
                  onClick={() => deleteDocument(doc.document_id)}
                  className={styles.deleteButton}
                  title="Remove document"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className={styles.main}>

        <div style={{
          padding: "8px 20px",
          fontSize: "12px",
          color: "#777",
          borderBottom: "1px solid #eee",
          background: "#fff"
        }}>
          Mode: <strong>{mode}</strong> | {persona}
        </div>

        <div className={styles.messagesContainer}>

          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <h2>Welcome to Cortéx</h2>
              <p>Upload documents or start a conversation.</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={styles.messageFade}>
              <MessageBubble
                role={m.role}
                content={m.content}
                sources={m.sources || []}
              />
            </div>
          ))}

          {isThinking && (
            <div className={styles.typing}>
              Cortéx is thinking...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className={styles.inputBar}>
          <div className={styles.inputWrapper}>
            <div className={styles.inputRow}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Cortéx..."
                className={styles.input}
              />

              <button
                onClick={handleSend}
                disabled={isSending}
                className={styles.sendButton}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

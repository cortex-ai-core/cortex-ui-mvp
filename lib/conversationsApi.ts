// Client for the backend's saved-conversation routes (design doc P1.6/P1.7).
// The server is the source of truth; the browser keeps a cache.

import { BACKEND, ApiError } from "@/lib/documentsApi";
import type { Citation } from "@/lib/citations";

export type ConversationRow = {
  conversation_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServerMessage = {
  message_id: string;
  seq: number;
  role: "user" | "assistant" | "system";
  content: string;
  mode: "retrieval" | "document" | "knowledge_base" | "private" | "simple" | "memory" | null;
  citations: Citation[];
  sources: unknown[];
  memory_ids: string[];
  created_at: string;
};

export type ConversationDetail = ConversationRow & {
  summary: { text: string; through_seq: number; updated_at: string } | null;
  messages: ServerMessage[];
};

function token() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${token()}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  return body as T;
}

export function listConversations(opts: { archived?: boolean; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.archived) q.set("archived", "1");
  if (opts.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return request<{ conversations: ConversationRow[] }>(`/api/conversations${qs ? `?${qs}` : ""}`);
}

export function getConversation(id: string, afterSeq = 0) {
  return request<ConversationDetail>(`/api/conversations/${id}${afterSeq ? `?after=${afterSeq}` : ""}`);
}

export function renameConversation(id: string, title: string) {
  return request<ConversationRow>(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
}

export function archiveConversation(id: string, archived = true) {
  return request<ConversationRow>(`/api/conversations/${id}/archive`, { method: "POST", body: JSON.stringify({ archived }) });
}

export function deleteConversation(id: string) {
  return request<{ deleted: boolean }>(`/api/conversations/${id}`, { method: "DELETE" });
}

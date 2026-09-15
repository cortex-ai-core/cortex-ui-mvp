// Client for the backend's saved-conversation routes (design doc P1.6/P1.7).
// The server is the source of truth; the browser keeps a cache.

import { BACKEND, ApiError } from "@/lib/documentsApi";
import type { Citation } from "@/lib/citations";

export type ConversationRow = {
  conversation_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  /** "archived" = summarised by retention, messages removed, read-only from then on */
  state?: "active" | "archived";
  archived_at: string | null;
  purged_at?: string | null;
  legal_hold?: boolean;
  created_at: string;
  updated_at: string;
};

/** The structured summary that outlives an archived chat (retention plan 5.4). */
export type ArchiveRecord = {
  conversation_id: string;
  title: string | null;
  summary: {
    topic?: string;
    purpose?: string;
    decisions?: string[];
    conclusions?: string[];
    action_items?: { item: string; owner?: string; due?: string }[];
    participants?: { name: string; role?: string }[];
    open_questions?: string[];
    documents_used?: { document_id: string; display_name: string | null }[];
    period?: { started_at?: string | null; ended_at?: string | null };
    counts?: { messages?: number; turns?: number };
    generation?: { model?: string | null; prompt_version?: string; fallback?: boolean; reason?: string | null; generated_at?: string };
  };
  summary_text: string;
  started_at: string | null;
  ended_at: string | null;
  message_count: number;
  model: string | null;
  prompt_version: string | null;
  fallback: boolean;
  created_at: string;
};

/** What the organization does with this user's chats, as the list route reports it. */
export type RetentionInfo = { days: number; hold: boolean; source: "namespace" | "organization" | "environment" };

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
  /** present once the chat has been archived; messages are then empty */
  archive?: ArchiveRecord | null;
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

export function listConversations(opts: { state?: "active" | "archived" | "all"; archived?: boolean; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.state) q.set("state", opts.state);
  else if (opts.archived) q.set("archived", "1");
  if (opts.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return request<{ conversations: ConversationRow[]; retention?: RetentionInfo }>(`/api/conversations${qs ? `?${qs}` : ""}`);
}

/** Summarise and archive one of your own chats now, ahead of the retention period. Not reversible. */
export function archiveConversationNow(id: string) {
  return request<{ archived: boolean; conversation_id: string; archive: ArchiveRecord | null }>(`/api/conversations/${id}/archive`, { method: "POST", body: JSON.stringify({ archived: true }) });
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

/** What a delete removed and what it deliberately kept (retention plan 5.5). */
export type PurgeReceipt = {
  messages: number;
  summary: boolean;
  archive: boolean;
  traces_scrubbed: number;
  /** Notes saved from this chat. They stay, marked as coming from a purged chat. */
  memories_kept: string[];
  schema_ready: boolean;
};

/**
 * A complete purge on the server. Throws ApiError 409 while the chat or
 * the organization is on legal hold, 404 when it is already gone.
 */
export function deleteConversation(id: string) {
  return request<{ deleted: boolean; conversation_id: string; receipt?: PurgeReceipt }>(`/api/conversations/${id}`, { method: "DELETE" });
}

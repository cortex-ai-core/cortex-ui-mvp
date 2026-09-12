// Shared citation shapes returned by POST /api/chat.

export type Citation = {
  n: number;
  chunk_id: string | null;
  document_id: string | null;
  file_name: string | null;
  display_name: string | null;
  page_start: number | null;
  page_end: number | null;
  section_label: string | null;
  snippet: string;
};

/** Which persona, version and style shaped an answer (the reply's `pcl`). */
export type PersonaProvenance = {
  persona_id: string | null;
  persona_key: string | null;
  persona_source: "user" | "namespace" | "none";
  version: number | null;
  style: string;
  style_source: "request" | "user" | "persona" | "default";
  personalization_chars: number;
  hash: string | null;
  source: "resolved" | "default";
  reason: string | null;
};

export type ChatMeta = {
  citations?: Citation[];
  sources?: Omit<Citation, "snippet" | "chunk_id">[];
  mode?: "retrieval" | "document" | "knowledge_base" | "private" | "simple" | "memory";
  /** server-side thread id; absent in private mode or when memory is off */
  conversationId?: string;
  /** persona provenance from the server; absent on older backends */
  pcl?: PersonaProvenance;
};

export function citationTitle(c: Pick<Citation, "display_name" | "file_name">) {
  return c.display_name?.trim() || c.file_name || "Document";
}

export function citationWhere(c: Pick<Citation, "page_start" | "page_end" | "section_label">) {
  const page =
    c.page_start != null
      ? c.page_end != null && c.page_end !== c.page_start
        ? `Pages ${c.page_start}–${c.page_end}`
        : `Page ${c.page_start}`
      : null;
  return [page, c.section_label].filter(Boolean).join(" · ");
}

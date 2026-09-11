// Client for the backend's document routes.
// Upload uses XHR so the browser reports real byte progress.

export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8080";

export type DocStatus =
  | "queued"
  | "parsing"
  | "structuring"
  | "learning"
  | "ready"
  | "failed";

export type DocumentRow = {
  document_id: string;
  file_name: string;
  display_name: string | null;
  document_type: string | null;
  description: string | null;
  has_rendition: boolean;
  namespace_id: string;
  status: DocStatus;
  stage_progress: number;
  stage_detail: string | null;
  error: string | null;
  page_count: number | null;
  parser: "legacy" | "docling";
  byte_size: number | null;
  has_original: boolean;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
};

export type DocumentType = {
  id: string;
  namespace_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type ParserHealth = { online: boolean; ocr?: string; version?: string; render?: boolean };

export type UploadMeta = {
  display_name?: string;
  document_type?: string;
  description?: string;
};

export type UploadResult = {
  document_id: string;
  file_name: string;
  status: DocStatus;
  duplicate: boolean;
  replaced_legacy?: boolean;
  message?: string;
};

export const IN_PROGRESS: DocStatus[] = ["queued", "parsing", "structuring", "learning"];

export function isInProgress(d: Pick<DocumentRow, "status">) {
  return IN_PROGRESS.includes(d.status);
}

/** What to show as the document's name. */
export function docTitle(d: Pick<DocumentRow, "file_name" | "display_name">) {
  return d.display_name?.trim() || d.file_name;
}

function token() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

// ---------------------------------------------------------------- documents
export function listDocuments() {
  return request<{ documents: DocumentRow[]; parser: ParserHealth }>("/api/documents");
}

export function documentStatus(id: string) {
  return request<DocumentRow & { events: { stage: string; message: string; created_at: string }[] }>(
    `/api/documents/${id}/status`
  );
}

export function retryDocument(id: string) {
  return request<{ document_id: string; status: DocStatus }>(`/api/documents/${id}/retry`, { method: "POST" });
}

export function deleteDocument(id: string) {
  return request<{ success: boolean }>(`/api/documents/${id}`, { method: "DELETE" });
}

export function updateDocument(id: string, patch: UploadMeta) {
  return request<DocumentRow>(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** Signed URL. Office files come back as their PDF rendition unless original=true. */
export function documentFileUrl(id: string, original = false) {
  return request<{ url: string; file_name: string; mime_type: string; rendition: boolean; expires_in: number }>(
    `/api/documents/${id}/file${original ? "?original=1" : ""}`
  );
}

/** Upload one file with byte-level progress. Resolves when the server has queued it. */
export function uploadDocument(
  file: File,
  meta: UploadMeta,
  onProgress: (fraction: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BACKEND}/api/documents/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token()}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("Couldn't reach the Cortéx server.", 0));
    xhr.ontimeout = () => reject(new ApiError("The upload timed out.", 0));
    xhr.onload = () => {
      let body: any = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* keep empty */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
      else reject(new ApiError(body?.error || `Upload failed (${xhr.status})`, xhr.status));
    };

    // text fields go first so the server has them before the file stream
    const fd = new FormData();
    if (meta.display_name) fd.append("display_name", meta.display_name);
    if (meta.document_type) fd.append("document_type", meta.document_type);
    if (meta.description) fd.append("description", meta.description);
    fd.append("file", file, file.name);
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(fd);
  });
}

// ---------------------------------------------------------------- types
export function listDocumentTypes() {
  return request<{ types: DocumentType[] }>("/api/document-types");
}

export function createDocumentType(input: { name: string; description?: string }) {
  return request<{ type: DocumentType }>("/api/document-types", { method: "POST", body: JSON.stringify(input) });
}

export function updateDocumentType(id: string, patch: { name?: string; description?: string; sort_order?: number }) {
  return request<{ type: DocumentType }>(`/api/document-types/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteDocumentType(id: string) {
  return request<{ deleted: boolean }>(`/api/document-types/${id}`, { method: "DELETE" });
}

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

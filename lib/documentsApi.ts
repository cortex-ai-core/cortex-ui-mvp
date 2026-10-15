import { BACKEND } from "./backend";
export { BACKEND } from "./backend";
// Client for the backend's document routes.
// Upload uses XHR so the browser reports real byte progress.



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

/** A document category. One list per organization, shared by every namespace (before migration 0014: per namespace). */
export type DocumentType = {
  id: string;
  organization_id?: string;
  namespace_id?: string;
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
  if (process.env.NEXT_PUBLIC_DIRECT_UPLOAD === "true") return directUpload(file,meta,onProgress);
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

async function directUpload(file:File,meta:UploadMeta,onProgress:(fraction:number)=>void):Promise<UploadResult> {
  if(file.size<1||file.size>50*1024*1024)throw new ApiError("Choose a nonempty file up to 50 MB.",400);
  const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
  const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  const prepared=await request<UploadResult & {uploadUrl?:string;headers?:Record<string,string>}>("/api/documents/upload-url",{method:"POST",body:JSON.stringify({...meta,file_name:file.name,byte_size:file.size,sha256})});
  if(prepared.duplicate)return prepared;
  if(!prepared.uploadUrl||!prepared.headers)throw new ApiError("Unable to prepare the upload.",502);
  const target=new URL(prepared.uploadUrl);
  if(target.protocol!=="https:"||!target.hostname.endsWith(".amazonaws.com"))throw new ApiError("Unexpected upload destination.",502);
  await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open("PUT",prepared.uploadUrl!);
    for(const [key,value]of Object.entries(prepared.headers!))xhr.setRequestHeader(key,value);
    xhr.timeout=10*60*1000;
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded/e.total);};
    xhr.onerror=()=>reject(new ApiError("Couldn't upload the file. You can retry it.",0));
    xhr.ontimeout=()=>reject(new ApiError("The upload timed out. You can retry it.",0));
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new ApiError("The upload was not accepted. Please retry.",xhr.status));
    xhr.send(file);
  });
  return request<UploadResult>(`/api/documents/${prepared.document_id}/upload-complete`,{method:"POST"});
}

// ---------------------------------------------------------------- types
// `organizationId` is for a super admin working on another organization; omitted = the caller's own.
const orgQuery = (organizationId?: string) => (organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "");

export function listDocumentTypes(organizationId?: string) {
  return request<{ types: DocumentType[]; scope?: "organization" | "namespace" }>(`/api/document-types${orgQuery(organizationId)}`);
}

export function createDocumentType(input: { name: string; description?: string }, organizationId?: string) {
  return request<{ type: DocumentType }>("/api/document-types", { method: "POST", body: JSON.stringify({ ...input, organizationId }) });
}

export function updateDocumentType(id: string, patch: { name?: string; description?: string; sort_order?: number }, organizationId?: string) {
  return request<{ type: DocumentType }>(`/api/document-types/${id}`, { method: "PATCH", body: JSON.stringify({ ...patch, organizationId }) });
}

export function deleteDocumentType(id: string, organizationId?: string) {
  return request<{ deleted: boolean }>(`/api/document-types/${id}${orgQuery(organizationId)}`, { method: "DELETE" });
}

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

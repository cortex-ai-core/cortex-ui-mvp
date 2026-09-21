// ----------------------------------------------------------------
// Chat attachments: the file is sent to the backend, read by the same
// document parser the knowledge base uses, and the text comes straight
// back. The server keeps nothing: no storage object, no documents row.
// ----------------------------------------------------------------

export type ParsedAttachment = {
  file_name: string;
  text: string;
  page_count: number | null;
  chars: number;
  /** true when the text was cut at the server's per-file ceiling */
  truncated: boolean;
  parser: string;
};

/** File types the parser reads, mirrored from the backend allowlist. */
export const ATTACHMENT_ACCEPT =
  ".pdf,.docx,.pptx,.xlsx,.md,.txt,.html,.htm,.png,.jpg,.jpeg,.tif,.tiff";

function backendUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORTEX_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORTEX_SERVER_URL?.trim() ||
    "http://localhost:8080"
  );
}

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export class AttachmentError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AttachmentError";
    this.status = status;
  }
}

/** Thrown when the caller aborted the parse (the user removed the chip). */
export class AttachmentCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "AttachmentCancelled";
  }
}

export async function parseAttachment(
  file: File,
  signal?: AbortSignal,
): Promise<ParsedAttachment> {
  const form = new FormData();
  form.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch(`${backendUrl()}/api/attachments/parse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: form,
      signal,
    });
  } catch (err) {
    if (signal?.aborted || (err as Error)?.name === "AbortError") throw new AttachmentCancelled();
    throw new AttachmentError("Couldn't reach the server to read that file.", 0);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AttachmentError(
      typeof body?.error === "string" ? body.error : `Couldn't read "${file.name}".`,
      res.status,
    );
  }
  return body as ParsedAttachment;
}

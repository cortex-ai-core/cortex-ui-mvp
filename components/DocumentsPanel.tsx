"use client";

import { useRef, useState } from "react";
import IngestProgress from "./IngestProgress";
import {
  type DocumentRow,
  type DocumentType,
  type ParserHealth,
  type UploadMeta,
  isInProgress,
  formatBytes,
  docTitle,
  retryDocument,
  deleteDocument as apiDelete,
  updateDocument,
  documentFileUrl,
} from "@/lib/documentsApi";
import { IconDoc, IconRefresh, IconSpinner, IconTrash, IconUpload, IconX } from "./icons";
import { useDialog } from "./Dialog";

export type PendingUpload = {
  id: string; // local id until the server assigns one
  file_name: string;
  display_name?: string | null;
  byte_size: number;
  progress: number; // 0..1
  error?: string | null;
  message?: string | null; // duplicate notice etc.
};

export type StagedFile = { file: File; meta: UploadMeta };

type Props = {
  workspace: string;
  documents: DocumentRow[];
  types: DocumentType[];
  parser: ParserHealth | null;
  pending: PendingUpload[];
  loading: boolean;
  error: string | null;
  canUpload: boolean;
  canDelete: boolean;
  onFiles: (items: StagedFile[]) => void;
  onDismissPending: (id: string) => void;
  onRefresh: () => void;
  onChanged: () => void;
};

const ACCEPT = ".pdf,.docx,.pptx,.xlsx,.md,.txt,.html,.png,.jpg,.jpeg,.tif,.tiff";

function friendlyError(err: string | null | undefined) {
  if (!err) return "Something went wrong while reading this document.";
  if (/could not load document|Conversion failed/i.test(err))
    return "We couldn't read this file. It may be corrupt or password-protected.";
  if (/no readable text/i.test(err))
    return "No readable text was found. If it's a scan, the image may be too faint.";
  if (/reach the parser|did not finish/i.test(err))
    return "The document reader isn't responding. Try again in a minute.";
  if (/limit is \d+ pages/i.test(err)) return err;
  return err.replace(/^Could not read this document:\s*/i, "");
}

/** "2025_LEE_3311_Technical-Teacher-Education_1765784712.pdf" → "2025 LEE 3311 Technical Teacher Education" */
function suggestName(fileName: string) {
  return fileName
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b\d{9,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const inputClass =
  "h-9 w-full rounded-lg border border-brand-100 bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15";

export default function DocumentsPanel(p: Props) {
  const dialog = useDialog();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [editing, setEditing] = useState<{ id: string; meta: Required<UploadMeta> } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const inProgress = p.documents.filter(isInProgress);
  const settledAll = p.documents.filter((d) => !isInProgress(d));
  const settled = typeFilter ? settledAll.filter((d) => (d.document_type || "") === typeFilter) : settledAll;
  const readyCount = settledAll.filter((d) => d.status === "ready").length;
  // "General" if the workspace has it; otherwise leave the type unset rather than guessing
  const defaultType = p.types.find((t) => /^general$/i.test(t.name))?.name || "";

  // ---- staging: pick files → fill in name / type / description → upload
  const pick = (files: FileList | null) => {
    const list = Array.from(files || []);
    if (inputRef.current) inputRef.current.value = "";
    if (!list.length) return;
    setStaged((prev) => [
      ...prev,
      ...list.map((file) => ({
        file,
        meta: { display_name: suggestName(file.name), document_type: defaultType, description: "" },
      })),
    ]);
  };

  const updateStaged = (i: number, patch: Partial<UploadMeta>) =>
    setStaged((prev) => prev.map((s, idx) => (idx === i ? { ...s, meta: { ...s.meta, ...patch } } : s)));

  const submitStaged = () => {
    if (!staged.length) return;
    p.onFiles(staged);
    setStaged([]);
  };

  // ---- row actions
  const remove = async (doc: DocumentRow) => {
    const ok = await dialog.confirm({
      title: `Remove "${docTitle(doc)}"?`,
      message: `It will be deleted from the ${p.workspace} knowledge base along with its indexed sections. This can't be undone.`,
      confirmLabel: "Delete document",
      danger: true,
    });
    if (!ok) return;
    setBusyId(doc.document_id);
    try {
      await apiDelete(doc.document_id);
      p.onChanged();
    } catch (e: any) {
      await dialog.alert({ title: "Couldn't delete that document", message: e?.message });
    } finally {
      setBusyId(null);
    }
  };

  const retry = async (doc: DocumentRow) => {
    setBusyId(doc.document_id);
    try {
      await retryDocument(doc.document_id);
      p.onChanged();
    } catch (e: any) {
      await dialog.alert({ title: "Couldn't retry", message: e?.message });
    } finally {
      setBusyId(null);
    }
  };

  const open = async (doc: DocumentRow, original = false) => {
    try {
      const { url } = await documentFileUrl(doc.document_id, original);
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      await dialog.alert({ title: "Couldn't open the document", message: e?.message });
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await updateDocument(editing.id, {
        display_name: editing.meta.display_name,
        document_type: editing.meta.document_type,
        description: editing.meta.description,
      });
      setEditing(null);
      p.onChanged();
    } catch (e: any) {
      await dialog.alert({ title: "Couldn't save changes", message: e?.message });
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (doc: DocumentRow) => {
    if (doc.status === "failed")
      return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Needs attention</span>;
    if (doc.parser === "legacy")
      return (
        <span
          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
          title="Added before page tracking existed. Citations for this file point to the file only. Re-upload the original to get page-level citations."
        >
          Text only
        </span>
      );
    return null;
  };

  const typePill = (doc: DocumentRow) =>
    doc.document_type ? (
      <span className="rounded-full border border-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-900">{doc.document_type}</span>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-brand-900">{p.workspace} knowledge base</h2>
          <p className="mt-1 text-[14px] text-ink-muted">Everyone in this workspace can ask Cortéx about these documents.</p>
        </div>
        <button
          onClick={p.onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-[13px] font-medium text-ink-muted transition hover:border-brand-500 hover:text-brand-900"
        >
          <IconRefresh size={14} />
          Refresh
        </button>
      </div>

      {p.parser && !p.parser.online && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          The document reader is offline. Uploads will wait in the queue until it&rsquo;s back.
        </div>
      )}

      {/* drop zone */}
      {p.canUpload && (
        <div className="mt-6">
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="sr-only" id="doc-upload" onChange={(e) => pick(e.target.files)} />
          <label
            htmlFor="doc-upload"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragging ? "border-brand-600 bg-brand-50" : "border-brand-200 bg-white hover:border-brand-500 hover:bg-brand-50/60"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-white">
              <IconUpload size={18} />
            </span>
            <span className="text-[14px] font-semibold text-brand-900">Add documents to the knowledge base</span>
            <span className="text-[12.5px] text-ink-muted">Drop files here or click to browse. PDF, Word, PowerPoint, Excel, Markdown, text, or images. Up to 50 MB each.</span>
          </label>
        </div>
      )}

      {/* staged files: name, type, description before upload */}
      {staged.length > 0 && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-brand-900">
              Ready to upload · {staged.length} file{staged.length === 1 ? "" : "s"}
            </div>
            <button onClick={() => setStaged([])} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50" aria-label="Cancel upload">
              <IconX size={14} />
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {staged.map((s, i) => (
              <div key={`${s.file.name}-${i}`} className="rounded-xl border border-brand-100 p-3">
                <div className="mb-2 flex items-center gap-2 text-[12px] text-ink-muted">
                  <IconDoc size={13} />
                  <span className="truncate">{s.file.name}</span>
                  <span>· {formatBytes(s.file.size)}</span>
                  <button onClick={() => setStaged((prev) => prev.filter((_, idx) => idx !== i))} className="ml-auto rounded p-1 hover:bg-brand-50" aria-label={`Remove ${s.file.name}`}>
                    <IconX size={12} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Name</span>
                    <input value={s.meta.display_name || ""} onChange={(e) => updateStaged(i, { display_name: e.target.value })} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Type</span>
                    <select value={s.meta.document_type || ""} onChange={(e) => updateStaged(i, { document_type: e.target.value })} className={inputClass}>
                      <option value="">No type</option>
                      {p.types.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Description (optional)</span>
                    <input value={s.meta.description || ""} onChange={(e) => updateStaged(i, { description: e.target.value })} placeholder="What this document is for" className={inputClass} />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            {p.types.length === 0 && (
              <span className="mr-auto text-[12px] text-ink-muted">Define document types under Settings to categorize uploads.</span>
            )}
            <button onClick={() => setStaged([])} className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-muted hover:bg-brand-50">Cancel</button>
            <button onClick={submitStaged} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-800">
              <IconUpload size={14} />
              Upload {staged.length === 1 ? "file" : `${staged.length} files`}
            </button>
          </div>
        </div>
      )}

      {p.error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">{p.error}</div>
      )}

      {/* in-flight + processing cards */}
      {(p.pending.length > 0 || inProgress.length > 0) && (
        <div className="mt-6 space-y-3">
          {p.pending.map((u) => (
            <div key={u.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-ink">{u.display_name || u.file_name}</div>
                  <div className="text-[12px] text-ink-muted">
                    {u.error ? u.error : u.message ? u.message : `Uploading · ${formatBytes(Math.round(u.progress * u.byte_size))} of ${formatBytes(u.byte_size)}`}
                  </div>
                </div>
                {(u.error || u.message) && (
                  <button onClick={() => p.onDismissPending(u.id)} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50" aria-label="Dismiss">
                    <IconX size={14} />
                  </button>
                )}
              </div>
              {!u.error && !u.message && <IngestProgress state={{ status: "uploading", progress: u.progress }} />}
            </div>
          ))}

          {inProgress.map((doc) => (
            <div key={doc.document_id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-ink">{docTitle(doc)}</div>
                  <div className="text-[12px] text-ink-muted">
                    {doc.status === "queued"
                      ? "Waiting to be read"
                      : doc.status === "parsing"
                      ? `Reading${doc.page_count ? ` ${doc.page_count} pages` : ""}. Scanned pages take longer.`
                      : doc.stage_detail || doc.status}
                  </div>
                </div>
                <span className="text-[12px] text-ink-muted">{formatBytes(doc.byte_size)}</span>
              </div>
              <IngestProgress state={{ status: doc.status, progress: doc.stage_progress, detail: doc.stage_detail }} />
            </div>
          ))}
        </div>
      )}

      {/* settled list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {readyCount} document{readyCount === 1 ? "" : "s"}
            {settledAll.length - readyCount > 0 ? ` · ${settledAll.length - readyCount} need attention` : ""}
          </span>
          <div className="flex items-center gap-2">
            {p.loading && <span className="text-[12px] text-ink-muted">Loading…</span>}
            {p.types.length > 0 && (
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 rounded-lg border border-brand-100 bg-white px-2 text-[12.5px] text-ink outline-none" aria-label="Filter by type">
                <option value="">All types</option>
                {p.types.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {settled.length === 0 && !p.loading && (
          <div className="px-5 py-10 text-center text-[14px] text-ink-muted">
            {typeFilter ? "No documents of this type." : <>No documents yet.{p.canUpload ? " Add some above to get started." : " Ask an admin to add some."}</>}
          </div>
        )}

        <ul className="divide-y divide-brand-100">
          {settled.map((doc) => {
            const failed = doc.status === "failed";
            const busy = busyId === doc.document_id;
            const isEditing = editing?.id === doc.document_id;
            return (
              <li key={doc.document_id} className="px-5 py-3.5">
                {isEditing ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                    {/* the document's identity stays visible while its details are edited */}
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-900">
                        <IconDoc />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-ink" title={doc.file_name}>{doc.file_name}</div>
                        <div className="text-[12px] text-ink-muted">
                          {[
                            doc.page_count ? `${doc.page_count} page${doc.page_count === 1 ? "" : "s"}` : null,
                            typeof doc.chunk_count === "number" ? `${doc.chunk_count} section${doc.chunk_count === 1 ? "" : "s"}` : null,
                            formatBytes(doc.byte_size) || null,
                            doc.parser === "legacy" ? "Text only" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-900">Editing</span>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Name</span>
                      <input value={editing.meta.display_name} onChange={(e) => setEditing({ ...editing, meta: { ...editing.meta, display_name: e.target.value } })} className={inputClass} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Type</span>
                      <select value={editing.meta.document_type} onChange={(e) => setEditing({ ...editing, meta: { ...editing.meta, document_type: e.target.value } })} className={inputClass}>
                        <option value="">No type</option>
                        {p.types.map((t) => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11.5px] font-medium text-ink-muted">Description</span>
                      <input value={editing.meta.description} onChange={(e) => setEditing({ ...editing, meta: { ...editing.meta, description: e.target.value } })} className={inputClass} />
                    </label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-brand-50">Cancel</button>
                      <button onClick={saveEdit} disabled={busy} className="rounded-lg bg-brand-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                        {busy ? <IconSpinner size={14} /> : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${failed ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-900"}`}>
                      <IconDoc />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-[14px] font-medium text-ink" title={doc.file_name}>{docTitle(doc)}</div>
                        {typePill(doc)}
                        {statusPill(doc)}
                      </div>
                      <div className="text-[12px] text-ink-muted">
                        {failed
                          ? friendlyError(doc.error)
                          : [
                              doc.description || null,
                              doc.page_count ? `${doc.page_count} page${doc.page_count === 1 ? "" : "s"}` : null,
                              typeof doc.chunk_count === "number" ? `${doc.chunk_count} section${doc.chunk_count === 1 ? "" : "s"}` : null,
                              formatBytes(doc.byte_size) || null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {failed && p.canUpload && (
                        <button onClick={() => retry(doc)} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-brand-900 transition hover:bg-brand-50 disabled:opacity-50">
                          {busy ? <IconSpinner size={14} /> : "Retry"}
                        </button>
                      )}
                      {doc.has_original && !failed && (
                        <button
                          onClick={() => open(doc)}
                          className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
                          title={doc.has_rendition ? "Open a PDF preview in a new tab" : "Open in a new tab"}
                        >
                          Open
                        </button>
                      )}
                      {p.canUpload && !failed && (
                        <button
                          onClick={() => setEditing({ id: doc.document_id, meta: { display_name: doc.display_name || "", document_type: doc.document_type || "", description: doc.description || "" } })}
                          className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
                        >
                          Edit
                        </button>
                      )}
                      {p.canDelete && (
                        <button onClick={() => remove(doc)} disabled={busy} className="rounded-lg p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label={`Delete ${docTitle(doc)}`} title={failed ? "Remove" : "Delete document"}>
                          {busy ? <IconSpinner size={14} /> : <IconTrash />}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

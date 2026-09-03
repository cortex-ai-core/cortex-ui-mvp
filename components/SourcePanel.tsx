"use client";

import { useState } from "react";
import { type Citation, citationTitle, citationWhere } from "@/lib/citations";
import { documentFileUrl } from "@/lib/documentsApi";
import { IconDoc, IconSpinner, IconX } from "./icons";
import { useDialog } from "./Dialog";

type Props = {
  citation: Citation | null;
  /** every citation in the same answer (kept for callers; not rendered) */
  all?: Citation[];
  onSelect?: (c: Citation) => void;
  onClose: () => void;
};

export default function SourcePanel({ citation, onClose }: Props) {
  const dialog = useDialog();
  const [opening, setOpening] = useState<"page" | "original" | null>(null);

  if (!citation) return null;
  const c = citation;
  const where = citationWhere(c);

  const open = async (original: boolean) => {
    if (!c.document_id) return;
    setOpening(original ? "original" : "page");
    try {
      const { url, rendition } = await documentFileUrl(c.document_id, original);
      // Browser PDF viewers honor #page=N; only meaningful when we have a PDF and a page
      const isPdf = rendition || /\.pdf$/i.test(c.file_name || "");
      const target = !original && isPdf && c.page_start ? `${url}#page=${c.page_start}` : url;
      window.open(target, "_blank", "noopener");
    } catch (e: any) {
      await dialog.alert({ title: "Couldn't open the document", message: e?.message });
    } finally {
      setOpening(null);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-brand-100 bg-white sm:w-[380px]" aria-label="Source">
      <div className="flex items-start gap-3 border-b border-brand-100 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-900">
          <IconDoc />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Source {c.n}</div>
          <div className="truncate text-[14.5px] font-semibold text-brand-900" title={c.file_name || undefined}>
            {citationTitle(c)}
          </div>
          {where ? (
            <div className="text-[12.5px] text-ink-muted">{where}</div>
          ) : (
            <div className="text-[12.5px] text-ink-muted">Text only · no page reference</div>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50 hover:text-brand-900" aria-label="Close source panel">
          <IconX size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Passage</div>
        <blockquote className="mt-2 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-[13.5px] leading-relaxed text-ink">
          {c.snippet || "No excerpt available."}
        </blockquote>

      </div>

      {c.document_id && (
        <div className="flex gap-2 border-t border-brand-100 px-5 py-3">
          <button
            onClick={() => open(false)}
            disabled={opening !== null}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {opening === "page" ? <IconSpinner size={14} /> : null}
            {c.page_start ? `Open page ${c.page_start}` : "Open document"}
          </button>
          <button
            onClick={() => open(true)}
            disabled={opening !== null}
            className="rounded-lg border border-brand-100 px-3 py-2 text-[13px] font-medium text-ink-muted transition hover:border-brand-500 hover:text-brand-900 disabled:opacity-60"
            title="Download the file as it was uploaded"
          >
            Original
          </button>
        </div>
      )}
    </aside>
  );
}

"use client";

import type { ArchiveRecord } from "@/lib/conversationsApi";
import { IconDoc } from "./icons";

function day(iso?: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch { return String(iso); }
}

/**
 * The record that stands in for an archived chat: what it was about, what
 * was settled, what is still owed. Read-only; the messages are gone.
 */
export default function ArchiveSummary({
  archive,
  archivedAt,
  retentionDays,
}: {
  archive: ArchiveRecord | null;
  archivedAt?: number;
  retentionDays?: number | null;
}) {
  const s = archive?.summary || {};
  const fallback = Boolean(archive?.fallback ?? s.generation?.fallback);
  const when = archivedAt ? day(new Date(archivedAt).toISOString()) : day(archive?.created_at);
  const period = s.period?.started_at
    ? `${day(s.period.started_at)}${s.period.ended_at && day(s.period.ended_at) !== day(s.period.started_at) ? ` to ${day(s.period.ended_at)}` : ""}`
    : archive?.started_at ? day(archive.started_at) : "";
  const count = s.counts?.messages ?? archive?.message_count ?? 0;

  const list = (label: string, items: string[] | undefined) =>
    items && items.length > 0 ? (
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">{label}</h4>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-6 text-ink">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">Archived chat</span>
          <span className="text-[12.5px] text-ink-muted">
            {period ? `${period} · ` : ""}{count} message{count === 1 ? "" : "s"}{when ? ` · summarised ${when}` : ""}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-ink-muted">
          {retentionDays
            ? `Chats in this workspace are kept in full for ${retentionDays} days after their last message. `
            : ""}
          This one was summarised and its messages removed. The summary below is all that remains, and it is yours to delete.
        </p>

        {!archive && (
          <p className="mt-5 text-[14px] text-ink">No summary is available for this chat.</p>
        )}

        {archive && (
          <div className="mt-5 space-y-5">
            {s.topic && <h3 className="text-[19px] font-semibold leading-snug text-brand-900">{s.topic}</h3>}
            {s.purpose && <p className="text-[14.5px] leading-6 text-ink">{s.purpose}</p>}
            {fallback && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                Only the details below could be kept for this chat{s.generation?.reason ? ` (${s.generation.reason})` : ""}.
              </p>
            )}
            {list("Decisions", s.decisions)}
            {list("Conclusions", s.conclusions)}
            {s.action_items && s.action_items.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Action items</h4>
                <ul className="mt-1.5 space-y-1 text-[14px] leading-6 text-ink">
                  {s.action_items.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                      <span>
                        {a.item}
                        {(a.owner || a.due) && (
                          <span className="text-ink-muted"> ({[a.owner, a.due].filter(Boolean).join(", ")})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {list("Open questions", s.open_questions)}
            {s.participants && s.participants.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">People</h4>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {s.participants.map((p, i) => (
                    <span key={i} className="rounded-full border border-brand-100 bg-brand-50/60 px-2.5 py-1 text-[12.5px] text-ink">
                      {p.name}{p.role ? <span className="text-ink-muted"> · {p.role}</span> : null}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {s.documents_used && s.documents_used.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Documents used</h4>
                <ul className="mt-1.5 space-y-1 text-[13.5px] text-ink">
                  {s.documents_used.map((d) => (
                    <li key={d.document_id} className="flex items-center gap-1.5">
                      <IconDoc size={13} className="shrink-0 text-brand-600" />
                      <span>{d.display_name || d.document_id}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

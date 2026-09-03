"use client";

import type { DocStatus } from "@/lib/documentsApi";

// The six stages a user sees. "uploading" is client-side; the rest map
// one-to-one onto documents.status on the server.
const STAGES: { key: string; label: string }[] = [
  { key: "uploading", label: "Uploading" },
  { key: "queued", label: "Queued" },
  { key: "parsing", label: "Reading" },
  { key: "structuring", label: "Organizing" },
  { key: "learning", label: "Learning" },
  { key: "ready", label: "Ready" },
];

const ORDER = STAGES.map((s) => s.key);

export type IngestState = {
  /** "uploading" while the browser is still sending bytes; otherwise the server status */
  status: "uploading" | DocStatus;
  /** 0..1 for uploading, 0..100 for learning; ignored elsewhere */
  progress?: number;
  detail?: string | null;
  error?: string | null;
};

export default function IngestProgress({ state }: { state: IngestState }) {
  const failed = state.status === "failed";
  // On failure the segment that lights red is the one we were in; we don't
  // know it precisely from the server, so assume Reading unless detail says otherwise.
  const activeKey = failed
    ? /learning/i.test(state.detail || "")
      ? "learning"
      : /section/i.test(state.detail || "")
      ? "structuring"
      : "parsing"
    : state.status;
  const activeIdx = Math.max(0, ORDER.indexOf(activeKey));

  const fill = (idx: number) => {
    if (idx < activeIdx) return 1;
    if (idx > activeIdx) return 0;
    if (state.status === "ready") return 1;
    if (state.status === "uploading") return Math.max(0.04, state.progress ?? 0);
    if (state.status === "learning") return Math.max(0.06, (state.progress ?? 0) / 100);
    if (failed) return 1;
    return 0.5; // indeterminate stages: queued, parsing, structuring
  };

  return (
    <div className="grid grid-cols-6 gap-1.5" aria-label="Processing progress">
      {STAGES.map((s, idx) => {
        const f = fill(idx);
        const isActive = idx === activeIdx;
        const isFailedSeg = failed && isActive;
        return (
          <div key={s.key} className="min-w-0">
            <div
              className={`h-1.5 overflow-hidden rounded-full ${
                isFailedSeg ? "bg-red-100" : "bg-brand-100"
              }`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  isFailedSeg
                    ? "bg-red-500"
                    : isActive && state.status !== "ready" && f < 1
                    ? "bg-brand-600"
                    : "bg-brand-900"
                }`}
                style={{ width: `${Math.round(f * 100)}%` }}
              />
            </div>
            <div
              className={`mt-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
                isFailedSeg
                  ? "text-red-700"
                  : idx <= activeIdx
                  ? "text-brand-900"
                  : "text-ink-muted/60"
              }`}
            >
              {isFailedSeg ? "Needs attention" : s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

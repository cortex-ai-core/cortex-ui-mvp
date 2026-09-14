"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconX } from "./icons";

export type ToastKind = "info" | "success" | "error";
type ToastState = { id: number; text: string; kind: ToastKind } | null;

const DEFAULT_MS = 3000;

/**
 * One short message in the top-right corner that goes away on its own
 * (3 s by default). For outcomes of an action the user just took: a chat
 * deleted, archived, a hold refused. Not for problems with what the user
 * is typing; those stay next to the composer.
 */
export function useToast(ms = DEFAULT_MS) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setToast(null);
  }, []);

  const show = useCallback((text: string, kind: ToastKind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), text, kind });
    timer.current = setTimeout(() => { timer.current = null; setToast(null); }, ms);
  }, [ms]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  const tone =
    toast.kind === "error" ? "border-red-200 bg-red-50 text-red-900"
    : toast.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-brand-100 bg-white text-ink";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-end px-4 sm:px-6" aria-live="polite">
      <div
        key={toast.id}
        role="status"
        className={`rise-in pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px] leading-5 shadow-[0_12px_40px_rgba(0,65,61,0.18)] ${tone}`}
      >
        <span className="min-w-0">{toast.text}</span>
        <button
          onClick={onDismiss}
          className="-mr-1 -mt-0.5 shrink-0 rounded p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss"
        >
          <IconX size={13} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { IconX } from "./icons";

// In-app replacement for window.confirm / window.alert, styled like the rest of Cortéx.
//
//   const dialog = useDialog();
//   if (await dialog.confirm({ title: "Delete document?", message: "…", confirmLabel: "Delete", danger: true })) …
//   await dialog.alert({ title: "Couldn't save", message: err.message });

export type DialogOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** red confirm button for destructive actions */
  danger?: boolean;
};

type Pending = DialogOptions & { kind: "confirm" | "alert"; resolve: (ok: boolean) => void };

type DialogApi = {
  confirm: (opts: DialogOptions) => Promise<boolean>;
  alert: (opts: DialogOptions) => Promise<void>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (ctx) return ctx;
  // Outside a provider (tests, legacy pages): fall back to the browser dialogs.
  return {
    confirm: async (o) => window.confirm(o.title + (o.message ? `\n\n${String(o.message)}` : "")),
    alert: async (o) => {
      window.alert(o.title + (o.message ? `\n\n${String(o.message)}` : ""));
    },
  };
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const open = useCallback((kind: Pending["kind"], opts: DialogOptions) => {
    return new Promise<boolean>((resolve) => setPending({ ...opts, kind, resolve }));
  }, []);

  const api: DialogApi = {
    confirm: (opts) => open("confirm", opts),
    alert: async (opts) => {
      await open("alert", opts);
    },
  };

  const close = useCallback(
    (ok: boolean) => {
      if (!pending) return;
      pending.resolve(ok);
      setPending(null);
    },
    [pending]
  );

  // keyboard: Esc cancels, Enter confirms; focus lands on the primary action
  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(pending.kind === "alert");
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <DialogContext.Provider value={api}>
      {children}

      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cortex-dialog-title"
        >
          <div className="absolute inset-0 bg-brand-950/40" onClick={() => close(pending.kind === "alert")} />

          <div className="rise-in relative w-full max-w-[440px] rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_20px_60px_rgba(0,65,61,0.25)]">
            <button
              onClick={() => close(pending.kind === "alert")}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
              aria-label="Close"
            >
              <IconX size={15} />
            </button>

            <h2 id="cortex-dialog-title" className="pr-8 text-[16px] font-semibold tracking-tight text-brand-900">
              {pending.title}
            </h2>

            {pending.message && (
              <div className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">{pending.message}</div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {pending.kind === "confirm" && (
                <button
                  onClick={() => close(false)}
                  className="rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
                >
                  {pending.cancelLabel || "Cancel"}
                </button>
              )}
              <button
                ref={confirmRef}
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white transition focus:outline-none focus:ring-4 ${
                  pending.danger
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-600/25"
                    : "bg-brand-900 hover:bg-brand-800 focus:ring-brand-600/25"
                }`}
              >
                {pending.confirmLabel || (pending.kind === "alert" ? "OK" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

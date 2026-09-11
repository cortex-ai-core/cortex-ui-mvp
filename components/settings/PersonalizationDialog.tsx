"use client";

import { useEffect, useRef } from "react";
import type { SettingsUser } from "@/lib/settingsApi";
import PersonalizationEditor from "./PersonalizationEditor";

export default function PersonalizationDialog({ user, onClose }: { user: SettingsUser; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="personalization-title"
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-brand-100 bg-white p-6 shadow-xl backdrop:bg-black/40">
      <h2 id="personalization-title" className="text-lg font-semibold text-brand-900">Edit personalization</h2>
      <p className="mb-4 break-words text-sm text-ink-muted">{user.email}</p>
      <PersonalizationEditor key={user.id} targetUserId={user.id} onClose={onClose} />
    </dialog>
  );
}

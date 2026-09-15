"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getPersonalization, savePersonalization, getUserPersonalization, saveUserPersonalization } from "@/lib/settingsApi";

export default function PersonalizationEditor({ targetUserId, onClose }: {
  targetUserId?: string;
  onClose?: () => void;
}) {
  const fieldId = useId();
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const saveInFlight = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    const load = targetUserId ? getUserPersonalization(targetUserId) : getPersonalization();
    load.then(result => {
      if (generation.current !== current) return;
      setText(result.personalization);
      setOriginal(result.personalization);
      setLoaded(true);
      setError(null);
    }).catch(reason => {
      if (generation.current === current) setError(reason instanceof Error ? reason.message : "Unable to load personalization.");
    });
    return () => { generation.current = current + 1; };
  }, [targetUserId, revision]);

  async function save() {
    if (!loaded || saveInFlight.current) return;
    saveInFlight.current = true;
    const current = generation.current;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = targetUserId
        ? await saveUserPersonalization(targetUserId, text)
        : await savePersonalization(text);
      if (generation.current !== current) return;
      setOriginal(result.personalization);
      setText(result.personalization);
      setSaved(true);
    } catch (reason) {
      if (generation.current === current) setError(reason instanceof Error ? reason.message : "Unable to save personalization.");
    } finally {
      saveInFlight.current = false;
      if (generation.current === current) setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-ink-muted">
        Tell Cortéx what it should know about you and how you’d like it to respond.
        These notes go with every message you send and shape how answers read.
        They never change which documents Cortéx may use or what those documents say.
        Clear this field and save to remove them.
      </p>
      {targetUserId && <p className="text-sm text-ink-muted">This user can see and edit these preferences in their own settings.</p>}
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">Response instructions and background</label>
      <textarea id={fieldId} value={text} maxLength={4000} rows={7}
        disabled={!loaded || saving}
        onChange={event => { setText(event.target.value); setSaved(false); }}
        placeholder="I lead a cybersecurity team. Keep answers concise, explain unfamiliar acronyms, and include clear next steps."
        aria-describedby={`${fieldId}-count`}
        className="w-full resize-y rounded-lg border border-brand-100 px-3 py-2 text-sm text-ink focus:border-brand-500 disabled:opacity-50"
      />
      <p id={`${fieldId}-count`} className="text-xs text-ink-muted">{text.length.toLocaleString()} / 4,000 characters</p>
      {!loaded && !error && <p role="status" className="text-sm text-ink-muted">Loading personalization…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error} {!loaded && <button className="underline" onClick={() => { setError(null); setRevision(value => value + 1); }}>Retry loading</button>}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">Personalization saved to the account.</p>}
      <div className="flex gap-2">
        <button onClick={() => void save()} disabled={!loaded || saving || text === original || text.length > 4000}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save personalization"}
        </button>
        {onClose && <button disabled={saving} onClick={onClose} className="rounded-lg border border-brand-100 px-4 py-2 text-sm disabled:opacity-50">{saved ? "Close" : "Cancel"}</button>}
      </div>
    </div>
  );
}

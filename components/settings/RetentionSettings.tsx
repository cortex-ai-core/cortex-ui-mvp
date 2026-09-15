"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOrganizationRetention,
  updateOrganizationRetention,
  listOrganizationHolds,
  setConversationHold,
  type OrganizationRetention,
  type HeldConversation,
} from "@/lib/settingsApi";
import { useDialog } from "@/components/Dialog";

/** The fixed choices; anything else shows as "Custom" with a number field. */
export const RETENTION_PRESETS: { value: number; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: 0, label: "Keep forever" },
];
const CUSTOM = "custom";
export const MAX_RETENTION_DAYS = 3650;

export function describeRetention(days: number): string {
  if (days === 0) return "kept forever";
  if (days === 365) return "kept 1 year";
  return `kept ${days} days`;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch { return String(iso); }
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The chat retention section of the "Edit organization" form.
 *
 * The retention period is a form field: the parent owns the value and
 * saves it with the organization's Save button (with a warning when a
 * shorter period would archive existing chats). The retention hold is
 * an action, not a field: it takes effect at once, needs a written
 * reason, and is confirmed in place before anything happens.
 */
export default function RetentionSettings({
  organizationId,
  organizationName,
  value,
  onChange,
  onHoldChanged,
}: {
  organizationId: string;
  organizationName: string;
  /** the period the form currently holds, in days (0 = forever) */
  value: number;
  onChange: (days: number) => void;
  /** the list should refresh its hold badge */
  onHoldChanged?: () => void;
}) {
  const dialog = useDialog();
  const [data, setData] = useState<OrganizationRetention | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>(RETENTION_PRESETS.some((p) => p.value === value) ? String(value) : CUSTOM);
  const [customDays, setCustomDays] = useState<string>(RETENTION_PRESETS.some((p) => p.value === value) ? "" : String(value));
  const [holdMode, setHoldMode] = useState<"idle" | "placing">("idle");
  const [holdReason, setHoldReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [holds, setHolds] = useState<HeldConversation[] | null>(null);
  const [showHolds, setShowHolds] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getOrganizationRetention(organizationId));
      setLoadError(null);
    } catch (reason) {
      const status = (reason as { status?: number })?.status;
      setLoadError(
        status === 404 ? "The backend you are connected to doesn't have the retention routes yet. Restart it on the current code."
        : status === 503 ? "Chat retention is not set up on this database yet (migration 0013)."
        : reason instanceof Error ? reason.message : "Unable to load chat retention.",
      );
    }
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  const loadHolds = useCallback(async () => {
    try { setHolds((await listOrganizationHolds(organizationId)).holds); } catch { setHolds([]); }
  }, [organizationId]);

  function pick(next: string) {
    setChoice(next);
    if (next === CUSTOM) { setCustomDays(customDays || String(value)); return; }
    onChange(Number(next));
  }
  function pickCustom(raw: string) {
    setCustomDays(raw);
    const n = Number(raw);
    if (raw !== "" && Number.isInteger(n) && n >= 0 && n <= MAX_RETENTION_DAYS) onChange(n);
  }

  async function placeHold() {
    const reason = holdReason.trim();
    if (!reason) { setNotice({ text: "Write the reason for the hold. It is recorded with the hold and shown to whoever releases it.", error: true }); return; }
    setBusy(true); setNotice(null);
    try {
      setData(await updateOrganizationRetention(organizationId, { retention_hold: true, retention_hold_reason: reason }));
      setHoldMode("idle"); setHoldReason("");
      setNotice({ text: `Hold placed. Nothing in ${organizationName} will be archived or deleted until it is released.`, error: false });
      onHoldChanged?.();
    } catch (reason) {
      setNotice({ text: reason instanceof Error ? reason.message : "Unable to place the hold.", error: true });
    } finally { setBusy(false); }
  }

  async function releaseHold() {
    const ok = await dialog.confirm({
      title: `Release the hold on ${organizationName}?`,
      message: "Archiving resumes at the next sweep and owners can delete their chats again. Chats past the retention period will be summarised and their messages removed. The release is recorded.",
      confirmLabel: "Release hold",
    });
    if (!ok) return;
    setBusy(true); setNotice(null);
    try {
      setData(await updateOrganizationRetention(organizationId, { retention_hold: false }));
      setNotice({ text: "Hold released.", error: false });
      onHoldChanged?.();
    } catch (reason) {
      setNotice({ text: reason instanceof Error ? reason.message : "Unable to release the hold.", error: true });
    } finally { setBusy(false); }
  }

  async function releaseChat(h: HeldConversation) {
    const ok = await dialog.confirm({
      title: `Release "${h.title || "Untitled chat"}"?`,
      message: `${h.owner_email || "Its owner"} will be able to delete it again, and it will be archived once it passes the retention period.${h.legal_hold_reason ? `\n\nHold reason: ${h.legal_hold_reason}` : ""}`,
      confirmLabel: "Release",
    });
    if (!ok) return;
    setNotice(null);
    try {
      await setConversationHold(h.conversation_id, false);
      setHolds((prev) => (prev || []).filter((x) => x.conversation_id !== h.conversation_id));
      setData((prev) => (prev ? { ...prev, counts: { ...prev.counts, held: Math.max(0, prev.counts.held - 1) } } : prev));
      setNotice({ text: `Released "${h.title || "Untitled chat"}".`, error: false });
    } catch (reason) {
      setNotice({ text: reason instanceof Error ? reason.message : "Unable to release the hold.", error: true });
    }
  }

  const org = data?.organization;
  const c = data?.counts;
  const onHold = Boolean(org?.retention_hold);
  const field = "mt-1 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-[14px] text-ink disabled:bg-brand-50";

  return (
    <div className="mt-5 border-t border-brand-100 pt-5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Chat retention</div>
      <p className="max-w-prose text-[13px] leading-relaxed text-ink-muted">
        How long a chat is kept in full after its last message. After that, Cortéx writes a short
        summary of what was discussed and decided, removes the messages, and keeps the summary until
        the chat&apos;s owner deletes it. Saved notes and uploaded documents are not affected.
      </p>

      {loadError && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{loadError}</div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-[12px] font-semibold text-ink-muted">
          Keep full chats for
          <select
            id={`retention-days-${organizationId}`}
            value={choice}
            onChange={(event) => pick(event.target.value)}
            className={field}
          >
            {RETENTION_PRESETS.map((p) => <option key={p.value} value={String(p.value)}>{p.label}</option>)}
            <option value={CUSTOM}>Custom…</option>
          </select>
          {choice === CUSTOM && (
            <span className="mt-2 flex items-center gap-2 font-normal">
              <input
                id={`retention-custom-${organizationId}`}
                type="number"
                min={0}
                max={MAX_RETENTION_DAYS}
                value={customDays}
                onChange={(event) => pickCustom(event.target.value)}
                className="w-24 rounded-lg border border-brand-100 bg-white px-3 py-2 text-[14px] text-ink"
                aria-label="Custom number of days"
              />
              <span className="text-[13px] text-ink-muted">days (0 keeps forever, up to {MAX_RETENTION_DAYS})</span>
            </span>
          )}
          <span className="mt-1 block text-[12px] font-normal text-ink-muted">
            Saved with the organization. Shortening the period archives older chats at the next sweep; you will be asked first.
          </span>
        </label>

        <div className="text-[12px] font-semibold text-ink-muted">
          Right now
          {c ? (
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[13.5px] font-normal text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
              <div><dt className="inline text-ink-muted">Active chats </dt><dd className="inline font-medium">{c.active}</dd></div>
              <div><dt className="inline text-ink-muted">Due at next sweep </dt><dd className="inline font-medium">{c.due}</dd></div>
              <div><dt className="inline text-ink-muted">Archived </dt><dd className="inline font-medium">{c.archived}</dd></div>
              <div><dt className="inline text-ink-muted">On hold </dt><dd className="inline font-medium">{c.held}</dd></div>
            </dl>
          ) : (
            <span className="mt-1 block font-normal text-ink-muted">{loadError ? "—" : "Loading…"}</span>
          )}
        </div>
      </div>

      {/* ---- the hold: an action with its own confirmation, not a form field */}
      <div className={`mt-5 rounded-xl border p-4 ${onHold ? "border-red-200 bg-red-50/60" : "border-brand-100 bg-brand-50/40"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-brand-900">Retention hold</span>
              {onHold && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Active</span>}
            </div>
            {onHold ? (
              <p className="mt-1 text-[13px] text-red-900">
                Nothing in {organizationName} is archived or deleted while this hold stands.
                {org?.last_updated_at ? ` Placed ${formatWhen(org.last_updated_at)}.` : ""}
                {org?.retention_hold_reason ? <><br /><span className="font-medium">Reason:</span> {org.retention_hold_reason}</> : null}
              </p>
            ) : (
              <p className="mt-1 max-w-prose text-[13px] text-ink-muted">
                For a legal matter, an audit or an investigation. Freezes every chat in the organization:
                the sweep skips them and owners cannot delete them until the hold is released. Saved notes
                and documents are not covered.
              </p>
            )}
          </div>
          {holdMode === "idle" && (
            onHold ? (
              <button type="button" onClick={() => void releaseHold()} disabled={busy || !data}
                className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                Release hold…
              </button>
            ) : (
              <button type="button" onClick={() => { setHoldMode("placing"); setNotice(null); }} disabled={busy || !data}
                className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                Place hold…
              </button>
            )
          )}
        </div>

        {holdMode === "placing" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-white p-4" role="group" aria-labelledby={`hold-title-${organizationId}`}>
            <div id={`hold-title-${organizationId}`} className="text-[13.5px] font-semibold text-red-800">Place a retention hold on {organizationName}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink">
              <li>Every chat in the organization stays exactly as it is, however old.</li>
              <li>Owners see &ldquo;on hold&rdquo; if they try to delete a chat.</li>
              <li>The hold, the reason and who placed it are recorded. Any administrator can release it.</li>
            </ul>
            <label className="mt-3 block text-[12px] font-semibold text-ink-muted">
              Reason (required)
              <input
                id={`hold-reason-${organizationId}`}
                type="text"
                value={holdReason}
                autoFocus
                maxLength={200}
                placeholder="e.g. Litigation hold, matter 2026-014"
                onChange={(event) => setHoldReason(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void placeHold(); } }}
                className={field}
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setHoldMode("idle"); setHoldReason(""); }} disabled={busy}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:bg-brand-50">Cancel</button>
              <button type="button" onClick={() => void placeHold()} disabled={busy || !holdReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Placing…" : "Place hold"}
              </button>
            </div>
          </div>
        )}

        {c && c.held > 0 && (
          <div className="mt-3">
            <button type="button" onClick={() => { setShowHolds((v) => !v); if (!holds) void loadHolds(); }}
              className="text-[12.5px] font-medium text-brand-700 underline-offset-2 hover:underline">
              {showHolds ? "Hide" : "Show"} {plural(c.held, "chat")} on an individual hold
            </button>
            {showHolds && (
              <ul className="mt-2 divide-y divide-brand-100 rounded-lg border border-brand-100 bg-white">
                {holds === null && <li className="px-3 py-2 text-[12.5px] text-ink-muted">Loading…</li>}
                {holds?.length === 0 && <li className="px-3 py-2 text-[12.5px] text-ink-muted">No chats on hold.</li>}
                {holds?.map((h) => (
                  <li key={h.conversation_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate font-medium text-brand-900">{h.title || "Untitled chat"}</span>
                    <span className="text-ink-muted">{h.owner_email || "unknown owner"}{h.namespace ? ` · ${h.namespace}` : ""}{h.state === "archived" ? " · archived" : ""}</span>
                    <span className="text-ink-muted">{h.legal_hold_reason || ""}{h.legal_hold_at ? ` · ${formatWhen(h.legal_hold_at)}` : ""}</span>
                    <button type="button" onClick={() => void releaseChat(h)} className="rounded-lg border border-brand-100 px-2.5 py-1 text-[12px] font-medium text-brand-700 hover:bg-brand-50">Release…</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {notice && (
        <p role="status" className={`mt-3 text-[13px] ${notice.error ? "text-red-700" : "text-emerald-700"}`}>{notice.text}</p>
      )}
    </div>
  );
}

/** One line for the organization card: the period and the hold, from the list payload. */
export function RetentionSummary({ organization }: { organization: { chat_retention_days?: number; retention_hold?: boolean; retention_hold_reason?: string | null } }) {
  if (organization.chat_retention_days === undefined) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
      <span>Chats {describeRetention(organization.chat_retention_days)}</span>
      {organization.retention_hold && (
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white" title={organization.retention_hold_reason || undefined}>
          Retention hold
        </span>
      )}
    </span>
  );
}

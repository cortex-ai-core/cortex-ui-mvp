import PersonalizationEditor from "./PersonalizationEditor";
import { useUserPreferences } from "@/lib/useUserPreferences";
import { useEffect, useState } from "react";
import type { Density } from "@/lib/useDensity";
import { getCurrentUserSettings, type PersonaLength, type SettingsUser } from "@/lib/settingsApi";
import { listConversations, type RetentionInfo } from "@/lib/conversationsApi";
import { IconLogout } from "@/components/icons";
import { BackToSettings } from "./shared";

const densityOptions: { value: Density; label: string; hint: string }[] = [
  {
    value: "compact",
    label: "Compact",
    hint: "Tighter spacing, smaller type, wider answers. Shows more of a conversation at once.",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    hint: "Roomier spacing and larger type for easier reading.",
  },
];

const lengthOptions: { value: PersonaLength | null; label: string; hint: string }[] = [
  { value: null, label: "Let the persona decide", hint: "Uses the length set on your persona, if any." },
  { value: "concise", label: "Concise", hint: "As short as the question allows." },
  { value: "standard", label: "Standard", hint: "A full answer without extra detail." },
  { value: "detailed", label: "Detailed", hint: "A full answer with its supporting detail." },
];

export default function UserSettings({
  userId,
  email,
  role,
  workspace,
  density,
  onDensityChange,
  onClearHistory,
  onSignOut,
  onBack,
}: {
  userId: string;
  email: string;
  role: string;
  workspace: string;
  density: Density;
  onDensityChange: (density: Density) => void;
  onClearHistory: () => Promise<void>;
  onSignOut: () => void;
  onBack: () => void;
}) {
  const {
    length: answerLength,
    loading: preferencesLoading,
    loaded: preferencesLoaded,
    saving: preferencesSaving,
    error: preferencesError,
    saved: preferencesSaved,
    save: onLengthChange,
    reload: onRetryPreferences,
  } = useUserPreferences(userId);
  const [profile, setProfile] = useState<SettingsUser | null>(null);
  // what the organization does with this user's chats (the list route reports it)
  const [retention, setRetention] = useState<RetentionInfo | null>(null);
  useEffect(() => {
    getCurrentUserSettings()
      .then(({ user }) => setProfile(user))
      .catch(() => undefined);
    listConversations({ limit: 1 })
      .then((r) => setRetention(r.retention ?? null))
      .catch(() => undefined);
  }, []);
  const accountEmail = profile?.email || email || userId;
  const accountRole = profile?.role?.name?.replaceAll("_", " ") || role;
  const accountWorkspace = profile?.organization?.name || workspace;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <BackToSettings onClick={onBack} />
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-brand-900">Account</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Signed in as", accountEmail],
              ["Role", accountRole],
              ["Organization", accountWorkspace],
            ].map(([key, value]) => (
              <div key={key}>
                <dt className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                  {key}
                </dt>
                <dd className="mt-1 text-[14.5px] font-medium capitalize text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {profile?.namespaces?.length ? (
            <div className="mt-5 border-t border-brand-100 pt-4">
              <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                Namespaces
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.namespaces.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-brand-900">Display</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            Choose how much of a conversation fits on screen. Applies
            immediately and is remembered in this browser.
          </p>
          <div
            role="radiogroup"
            aria-label="Display density"
            className="mt-4 grid gap-2 sm:grid-cols-2"
          >
            {densityOptions.map((option) => {
              const selected = density === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onDensityChange(option.value)}
                  className={`rounded-xl border p-3.5 text-left transition ${
                    selected
                      ? "border-brand-900 bg-brand-50 ring-1 ring-brand-900"
                      : "border-brand-100 bg-white hover:border-brand-500"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? "border-brand-900" : "border-brand-200"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-brand-900" />
                      )}
                    </span>
                    <span className="text-[14px] font-semibold text-brand-900">
                      {option.label}
                    </span>
                  </span>
                  <span className="mt-1.5 block pl-[26px] text-[12.5px] leading-5 text-ink-muted">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-brand-900">
            Answer length
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            How much each answer should say. How Cortéx sounds comes from the
            persona your administrator assigned; this is your own preference
            on top of it, and applies from your next message on.
          </p>
          <p className="mt-2 text-sm text-ink-muted" role="status">
            {preferencesLoading
              ? "Loading saved answer length…"
              : preferencesSaving
                ? "Saving…"
                : preferencesSaved
                  ? "Answer length saved to your account."
                  : "Changes are saved automatically to your account."}
          </p>
          {preferencesError && (
            <div
              role="alert"
              className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {preferencesError}{" "}
              {preferencesLoaded ? (
                "Your previous answer length is unchanged. Select one to try again."
              ) : (
                <button onClick={onRetryPreferences} className="underline">
                  Retry loading
                </button>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {lengthOptions.map((option) => (
              <button
                key={option.value ?? "persona"}
                onClick={() => void onLengthChange(option.value)}
                disabled={!preferencesLoaded || preferencesSaving}
                aria-pressed={answerLength === option.value}
                title={option.hint}
                className={`disabled:opacity-50 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${answerLength === option.value ? "border-brand-900 bg-brand-900 text-white" : "border-brand-100 bg-white text-ink hover:border-brand-500"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-[15px] font-semibold text-brand-900">Personalization</h2>
          <PersonalizationEditor key={userId} />
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-brand-900">
            Privacy and Data
          </h2>
          <ul className="mt-3 space-y-2 text-[13.5px] text-ink-muted">
            <li>
              Chats are saved to your account, so they follow you across
              devices.{" "}
              {retention
                ? retention.days === 0
                  ? "Your organization keeps them in full for as long as you keep them."
                  : `Your organization keeps each chat in full for ${retention.days} days after its last message. After that Cortéx keeps a short summary of what was discussed and decided, and removes the messages. Archived chats stay in your list, read-only.`
                : "Your organization sets how long they are kept in full before they are summarised."}
              {retention?.hold
                ? " A retention hold is in place right now, so no chat is archived or deleted until it is released."
                : ""}
            </li>
            <li>
              You can delete a chat at any time from the list. That removes its
              messages and its summary everywhere. Notes Cortéx saved from it
              are kept and marked as coming from a deleted chat.
            </li>
            <li>
              Files attached in a chat are used for that conversation only.
              Documents added under My documents are shared with the whole
              workspace.
            </li>
            <li>
              Private chats are never saved: not in this browser, not as a
              thread on the server, and not as memory for future answers.
              Files you attach are sent to the server to be read, then
              discarded. Private chats answer only from those files, skip the
              shared knowledge base, and are cleared when you leave private
              mode or refresh.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={onClearHistory}
              className="rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Delete all my chats
            </button>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-brand-800"
            >
              <IconLogout size={14} />
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

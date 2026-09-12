"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activatePersona,
  createPersona,
  deactivatePersona,
  getPersonaVersions,
  getPersonas,
  getUsers,
  previewPersona,
  savePersonaVersion,
  updatePersona,
  PERSONA_LENGTHS,
  PERSONA_LIST_SECTIONS,
  ValidationError,
  type PersonaConfiguration,
  type PersonaLength,
  type PersonaListSection,
  type PersonaPreview,
  type PersonaRecord,
  type PersonaVersion,
  type SettingsUser,
} from "@/lib/settingsApi";
import { useDialog } from "@/components/Dialog";
import { BackToSettings, GrowingTextarea } from "./shared";

// ---------------------------------------------------------------
// The editor keeps one field per configuration section (spec 43's
// vocabulary) and converts to and from the JSON the server validates.
// ---------------------------------------------------------------
const SECTION_LABELS: Record<PersonaListSection, { label: string; hint: string }> = {
  operating_instructions: { label: "Operating instructions", hint: "What every answer should do. Rendered as the TASK block." },
  evaluation_rules: { label: "Evaluation rules", hint: "How to weigh and score what the sources say." },
  evidence_requirements: { label: "Evidence requirements", hint: "What must be present before a claim is made." },
  decision_rules: { label: "Decision rules", hint: "When and how to recommend." },
  formatting: { label: "Formatting", hint: "Layout conventions for the answer." },
  output_structure: { label: "Output structure", hint: "Rendered as the STRUCTURE RULES block." },
  workflow: { label: "Workflow", hint: "Steps to follow for this audience's tasks." },
  domain_instructions: { label: "Domain instructions", hint: "Anything specific to this field." },
  required: { label: "Required in every answer", hint: "Items every answer must include." },
  prohibited: { label: "Never", hint: "Items no answer may include." },
};
type Form = {
  identity: string;
  length: "" | PersonaLength;
  lists: Record<PersonaListSection, string>;
  prefer: string;
  protect: string;
};

const emptyForm = (): Form => ({
  identity: "", length: "",
  lists: Object.fromEntries(PERSONA_LIST_SECTIONS.map((s) => [s, ""])) as Record<PersonaListSection, string>,
  prefer: "", protect: "",
});

const lines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

function fromConfiguration(config: PersonaConfiguration | null | undefined): Form {
  const form = emptyForm();
  if (!config) return form;
  form.identity = config.identity?.text || "";
  form.length = config.response?.length || "";
  for (const section of PERSONA_LIST_SECTIONS) form.lists[section] = (config[section] || []).join("\n");
  form.prefer = Object.entries(config.terminology?.prefer || {}).map(([from, to]) => `${from} -> ${to}`).join("\n");
  form.protect = (config.terminology?.protect || []).join("\n");
  return form;
}

function toConfiguration(form: Form): PersonaConfiguration {
  const config: PersonaConfiguration = { schema: 1 };
  if (form.identity.trim()) config.identity = { text: form.identity.trim() };
  if (form.length) config.response = { length: form.length };
  for (const section of PERSONA_LIST_SECTIONS) {
    const items = lines(form.lists[section]);
    if (items.length) config[section] = items;
  }
  const prefer: Record<string, string> = {};
  for (const line of lines(form.prefer)) {
    const m = line.match(/^(.+?)\s*(?:->|=>|=)\s*(.+)$/);
    if (m) prefer[m[1].trim()] = m[2].trim();
    else prefer[line] = "";           // the server names the empty value in its error
  }
  const protect = lines(form.protect);
  if (Object.keys(prefer).length || protect.length) {
    config.terminology = { ...(Object.keys(prefer).length ? { prefer } : {}), ...(protect.length ? { protect } : {}) };
  }
  return config;
}

/** Group server errors under the section they name; the rest are general. */
function groupErrors(errors: string[]) {
  const bySection: Record<string, string[]> = {};
  const general: string[] = [];
  for (const error of errors) {
    const m = error.match(/^([a-z_]+)(?:\.[a-z_]+)?(?:\[\d+\])?(?:\[".*?"\])?\s/);
    const key = m?.[1];
    if (key && (PERSONA_LIST_SECTIONS as readonly string[]).includes(key)) (bySection[key] ||= []).push(error);
    else if (key === "identity" || key === "response" || key === "terminology") (bySection[key] ||= []).push(error);
    else general.push(error);
  }
  return { bySection, general };
}

const input = "w-full rounded-lg border border-brand-100 px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand-500 disabled:opacity-50";
const primary = "inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-brand-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-brand-100 px-3.5 py-2.5 text-[13px] font-medium text-brand-900 hover:bg-brand-50 disabled:opacity-50";
const when = (iso: string) => new Date(iso).toLocaleString();

/** Label on one line, hint on the next, then the control: every field on the page lines up the same way. */
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-[12px] leading-5 text-ink-muted">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
      {error?.map((e) => <span key={e} role="alert" className="mt-1 block text-[12.5px] text-red-700">{e}</span>)}
    </label>
  );
}

export default function PersonaAdministration({ role, userId, onBack }: { role: string; userId: string; onBack: () => void }) {
  const dialog = useDialog();
  const isSuperAdmin = role === "super_admin";
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PersonaVersion[]>([]);
  const [form, setForm] = useState<Form>(emptyForm());
  const [json, setJson] = useState("");
  const [mode, setMode] = useState<"form" | "json">("form");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({ name: "", description: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ key: "", name: "", description: "", shared: false });
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [previewUserId, setPreviewUserId] = useState(userId);
  const [preview, setPreview] = useState<PersonaPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const selected = useMemo(() => personas.find((p) => p.id === selectedId) || null, [personas, selectedId]);
  const canEdit = selected ? (selected.shared ? isSuperAdmin : true) : false;

  const load = useCallback(() => {
    return Promise.all([getPersonas(), getUsers().catch(() => ({ users: [] as SettingsUser[] }))])
      .then(([{ personas: list }, userResult]) => {
        setPersonas(list);
        setUsers(userResult.users);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load personas.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback(async (persona: PersonaRecord) => {
    setSelectedId(persona.id);
    setDetails({ name: persona.name, description: persona.description || "" });
    setErrors([]); setWarnings([]); setNotice(null); setPreview(null); setShowVersions(false);
    try {
      const { versions: list } = await getPersonaVersions(persona.id);
      setVersions(list);
      const current = list[0]?.configuration || {};
      setForm(fromConfiguration(current));
      setJson(JSON.stringify(current, null, 2));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load versions.");
    }
  }, []);

  function fail(reason: unknown, fallback: string) {
    if (reason instanceof ValidationError) { setErrors(reason.errors); setWarnings(reason.warnings); setNotice(null); }
    else setError(reason instanceof Error ? reason.message : fallback);
  }

  async function create() {
    setSaving(true); setError(null);
    try {
      const { persona } = await createPersona({ key: createForm.key.trim().toLowerCase(), name: createForm.name.trim(), description: createForm.description.trim() || undefined, ...(createForm.shared ? { shared: true } : {}) });
      setShowCreate(false);
      setCreateForm({ key: "", name: "", description: "", shared: false });
      await load();
      await select(persona);
      setNotice(`Created ${persona.name} at version 1. Add its rules below and save.`);
    } catch (reason) { fail(reason, "Unable to create persona."); }
    finally { setSaving(false); }
  }

  async function saveDetails() {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      await updatePersona(selected.id, { name: details.name.trim(), description: details.description.trim() });
      await load();
      setNotice("Name and description saved.");
    } catch (reason) { fail(reason, "Unable to save."); }
    finally { setSaving(false); }
  }

  async function saveVersion(configuration: PersonaConfiguration) {
    if (!selected) return;
    setSaving(true); setError(null); setErrors([]); setWarnings([]);
    try {
      const { version, warnings: w } = await savePersonaVersion(selected.id, configuration);
      setWarnings(w);
      setNotice(`Saved as version ${version.version}. It is in force for every user on this persona from their next message.`);
      await load();
      const { versions: list } = await getPersonaVersions(selected.id);
      setVersions(list);
      setForm(fromConfiguration(version.configuration));
      setJson(JSON.stringify(version.configuration, null, 2));
    } catch (reason) { fail(reason, "Unable to save the version."); }
    finally { setSaving(false); }
  }

  function saveFromEditor() {
    if (mode === "json") {
      try { void saveVersion(JSON.parse(json)); }
      catch { setErrors(["The JSON does not parse. Fix it and save again."]); }
    } else void saveVersion(toConfiguration(form));
  }

  async function toggleActive() {
    if (!selected) return;
    if (selected.is_active) {
      const ok = await dialog.confirm({
        title: `Deactivate ${selected.name}?`,
        message: `Users assigned to it fall back to their namespace default on their next message. Its versions are kept and it can be activated again.${selected.namespaces ? " It is a namespace default, so the server will refuse until another default is chosen." : ""}`,
        confirmLabel: "Deactivate", danger: true,
      });
      if (!ok) return;
    }
    setSaving(true); setError(null);
    try {
      if (selected.is_active) await deactivatePersona(selected.id); else await activatePersona(selected.id);
      await load();
      setNotice(selected.is_active ? `${selected.name} deactivated.` : `${selected.name} activated.`);
    } catch (reason) { fail(reason, "Unable to change the persona."); }
    finally { setSaving(false); }
  }

  async function runPreview() {
    setPreviewBusy(true); setError(null);
    try { setPreview(await previewPersona(previewUserId)); }
    catch (reason) { fail(reason, "Unable to preview."); }
    finally { setPreviewBusy(false); }
  }

  const grouped = useMemo(() => groupErrors(errors), [errors]);
  const list = (section: PersonaListSection) => (
    <Field key={section} label={SECTION_LABELS[section].label} hint={`${SECTION_LABELS[section].hint} One item per line.`} error={grouped.bySection[section]}>
      <GrowingTextarea id={`persona-${section}`} minRows={2} value={form.lists[section]} disabled={!canEdit || saving}
        onChange={(e) => setForm({ ...form, lists: { ...form.lists, [section]: e.target.value } })}
        className={`${input} ${grouped.bySection[section] ? "border-red-300" : ""}`} />
    </Field>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <BackToSettings onClick={onBack} />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">Personas</h2>
            <p className="mt-1 text-[14px] leading-6 text-ink-muted">
              How Cortéx sounds and works for each audience. Rules are saved as numbered versions; the newest is in force. Style and structure change, the evidence never does.
            </p>
          </div>
          <button onClick={() => setShowCreate((v) => !v)} className={`${primary} shrink-0`}>{showCreate ? "Cancel" : "New persona"}</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13.5px] text-emerald-800">{notice}</div>}

        {showCreate && (
          <form onSubmit={(e) => { e.preventDefault(); void create(); }} className="mb-5 grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-card sm:grid-cols-2">
            <label className="text-[12px] font-semibold text-ink-muted">Key
              <input id="persona-create-key" required pattern="[a-z][a-z0-9_]{1,63}" value={createForm.key} onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })} placeholder="talent_intelligence" className={`mt-1.5 ${input}`} />
              <span className="mt-1 block text-[11.5px] font-normal">Lowercase letters, digits and underscores. Used in logs and traces; cannot be changed later.</span>
            </label>
            <label className="text-[12px] font-semibold text-ink-muted">Name
              <input id="persona-create-name" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Talent Intelligence" className={`mt-1.5 ${input}`} />
            </label>
            <label className="text-[12px] font-semibold text-ink-muted sm:col-span-2">Description
              <GrowingTextarea id="persona-create-description" minRows={2} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className={`mt-1.5 ${input}`} />
            </label>
            {isSuperAdmin && (
              <label className="flex items-center gap-2 text-[13px] text-ink sm:col-span-2">
                <input id="persona-create-shared" type="checkbox" checked={createForm.shared} onChange={(e) => setCreateForm({ ...createForm, shared: e.target.checked })} />
                Shared by every organization
              </label>
            )}
            {grouped.general.length > 0 && !selected && <ul className="text-[12.5px] text-red-700 sm:col-span-2">{grouped.general.map((e) => <li key={e}>{e}</li>)}</ul>}
            <div className="sm:col-span-2"><button disabled={saving} className={primary}>{saving ? "Creating…" : "Create persona"}</button></div>
          </form>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* ---------------- list ---------------- */}
          <div className="space-y-2">
            {loading && <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-ink-muted shadow-card">Loading personas…</div>}
            {!loading && personas.length === 0 && <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-ink-muted shadow-card">No personas yet.</div>}
            {personas.map((p) => (
              <button key={p.id} onClick={() => void select(p)} aria-pressed={p.id === selectedId}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-card transition hover:border-brand-400 ${p.id === selectedId ? "border-brand-500 ring-1 ring-brand-500" : "border-brand-100"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold text-brand-900">{p.name}</div>
                    <div className="truncate text-[11.5px] text-ink-muted">{p.key} · {p.shared ? "shared" : p.organization?.name}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{p.is_active ? "Active" : "Inactive"}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 text-[11.5px] text-ink-muted">
                  <span>v{p.current_version?.version ?? 0}</span>
                  <span>{p.users} user{p.users === 1 ? "" : "s"}</span>
                  <span>{p.namespaces} namespace{p.namespaces === 1 ? "" : "s"}</span>
                </div>
              </button>
            ))}
          </div>

          {/* ---------------- editor ---------------- */}
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-brand-100 bg-white p-8 text-center text-ink-muted shadow-card">Select a persona to see and edit its rules.</div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-brand-900">{selected.name} <span className="font-normal text-ink-muted">· v{selected.current_version?.version ?? 0}</span></h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">{selected.key} · {selected.shared ? "shared by every organization" : selected.organization?.name}{!canEdit && " · read only: only a super administrator changes shared personas"}</p>
                  </div>
                  <button onClick={() => void toggleActive()} disabled={!canEdit || saving} className={`${secondary} shrink-0`}>{selected.is_active ? "Deactivate" : "Activate"}</button>
                </div>
                <div className="mt-5 space-y-4">
                  <Field label="Name">
                    <input id="persona-name" value={details.name} disabled={!canEdit || saving} onChange={(e) => setDetails({ ...details, name: e.target.value })} className={`${input} max-w-md`} />
                  </Field>
                  <Field label="Description" hint="What this persona is for, in a sentence or two. Shown in the list and in User Management.">
                    <GrowingTextarea id="persona-description" minRows={2} value={details.description} disabled={!canEdit || saving} onChange={(e) => setDetails({ ...details, description: e.target.value })} className={input} />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button onClick={() => void saveDetails()} disabled={!canEdit || saving || (details.name.trim() === selected.name && details.description.trim() === (selected.description || ""))} className={primary}>Save name and description</button>
                </div>
              </section>

              <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-brand-900">Rules</h3>
                  <div className="flex gap-1 rounded-lg border border-brand-100 p-0.5 text-[12px]">
                    {(["form", "json"] as const).map((m) => (
                      <button key={m} onClick={() => { if (m === "json") setJson(JSON.stringify(toConfiguration(form), null, 2)); else { try { setForm(fromConfiguration(JSON.parse(json))); } catch { /* keep the form */ } } setMode(m); }}
                        aria-pressed={mode === m} className={`rounded-md px-3 py-1 font-medium ${mode === m ? "bg-brand-900 text-white" : "text-ink-muted"}`}>{m === "form" ? "Fields" : "JSON"}</button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-muted">Saving creates the next version. A save that fails validation changes nothing and the current version stays in force.</p>

                {grouped.general.length > 0 && <ul role="alert" className="mt-3 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">{grouped.general.map((e) => <li key={e}>{e}</li>)}</ul>}
                {warnings.length > 0 && <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}

                {mode === "json" ? (
                  <div className="mt-5">
                    <GrowingTextarea id="persona-json" minRows={12} value={json} disabled={!canEdit || saving} onChange={(e) => setJson(e.target.value)} spellCheck={false}
                      className={`${input} font-mono text-[12.5px]`} />
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    <Field label="Identity" hint="Who Cortéx is for this audience. Opens the prompt." error={grouped.bySection.identity}>
                      <GrowingTextarea id="persona-identity" minRows={3} value={form.identity} disabled={!canEdit || saving} onChange={(e) => setForm({ ...form, identity: e.target.value })} className={`${input} ${grouped.bySection.identity ? "border-red-300" : ""}`} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Default answer length" hint="How much an answer should say. A user's own setting in User Settings overrides it.">
                        <select id="persona-length" value={form.length} disabled={!canEdit || saving} onChange={(e) => setForm({ ...form, length: e.target.value as Form["length"] })} className={input}>
                          <option value="">Not set</option>
                          {PERSONA_LENGTHS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </Field>
                    </div>
                    {grouped.bySection.response?.map((e) => <p key={e} role="alert" className="text-[12.5px] text-red-700">{e}</p>)}
                    {PERSONA_LIST_SECTIONS.map(list)}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Preferred terms" hint="One per line as: term -> preferred term.">
                        <GrowingTextarea id="persona-prefer" minRows={2} value={form.prefer} disabled={!canEdit || saving} onChange={(e) => setForm({ ...form, prefer: e.target.value })} className={input} />
                      </Field>
                      <Field label="Protected terms" hint="Kept exactly as the sources write them. One per line.">
                        <GrowingTextarea id="persona-protect" minRows={2} value={form.protect} disabled={!canEdit || saving} onChange={(e) => setForm({ ...form, protect: e.target.value })} className={input} />
                      </Field>
                    </div>
                    {grouped.bySection.terminology?.map((e) => <p key={e} role="alert" className="text-[12.5px] text-red-700">{e}</p>)}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-brand-100 pt-4">
                  <button onClick={saveFromEditor} disabled={!canEdit || saving} className={primary}>{saving ? "Saving…" : `Save as version ${(selected.current_version?.version ?? 0) + 1}`}</button>
                  <button onClick={() => setShowVersions((v) => !v)} className={secondary}>{showVersions ? "Hide versions" : `Versions (${versions.length})`}</button>
                </div>
                {showVersions && (
                  <ol className="mt-4 divide-y divide-brand-100 rounded-xl border border-brand-100">
                    {versions.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                        <span><span className="font-semibold text-brand-900">v{v.version}</span> <span className="text-ink-muted">· {when(v.created_at)} · {v.created_by ? `by ${users.find((u) => u.id === v.created_by)?.email || v.created_by}` : "seed"}</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => { setForm(fromConfiguration(v.configuration)); setJson(JSON.stringify(v.configuration, null, 2)); setNotice(`Loaded v${v.version} into the editor. Save to make it the newest version.`); }} className={secondary}>Load</button>
                          {v.version !== versions[0]?.version && <button disabled={!canEdit || saving} onClick={() => void saveVersion(v.configuration)} className={secondary}>Restore this version</button>}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                <h3 className="text-[15px] font-semibold text-brand-900">Preview for a user</h3>
                <p className="mt-1 text-[12.5px] text-ink-muted">Exactly what this user gets on their next message: which persona and version, the style, and the text the model sees.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <select id="persona-preview-user" value={previewUserId} onChange={(e) => setPreviewUserId(e.target.value)} className={`${input} w-auto min-w-[16rem] max-w-full`}>
                    {!users.some((u) => u.id === userId) && <option value={userId}>You</option>}
                    {users.map((u) => <option key={u.id} value={u.id}>{u.email}{u.id === userId ? " (you)" : ""}</option>)}
                  </select>
                  <button onClick={() => void runPreview()} disabled={previewBusy} className={primary}>{previewBusy ? "Loading…" : "Preview"}</button>
                </div>
                {preview && (
                  <div className="mt-4 space-y-3 text-[13px]">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink">
                      <span><span className="text-ink-muted">Persona:</span> {preview.persona ? `${preview.persona.name} · v${preview.version} (${preview.persona_source === "user" ? "assigned" : "namespace default"})` : preview.source === "default" ? `built-in default (${preview.reason})` : "none, built-in default"}</span>
                      <span><span className="text-ink-muted">Length:</span> {preview.length ? `${preview.length} (${preview.length_source === "user" ? "the user's own" : "persona default"})` : "not set"}</span>
                      <span><span className="text-ink-muted">Note:</span> {preview.personalization ? `${preview.personalization.length} characters` : "none"}</span>
                    </div>
                    {preview.rendered && (["persona", "structureRules", "task", "rules", "terminology", "personalization"] as const).map((k) => preview.rendered?.[k] ? (
                      <pre key={k} className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-brand-50 p-3 font-mono text-[12px] text-ink">{preview.rendered[k]}</pre>
                    ) : null)}
                    {!preview.rendered && <p className="text-ink-muted">Nothing configured: the built-in prompt applies.</p>}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  assignUserPersona,
  createUser,
  getOrganizations,
  getPersonas,
  getRoles,
  getUsers,
  updateUser,
  type OrganizationRecord,
  type PersonaRecord,
  type RoleRecord,
  type SettingsUser,
} from "@/lib/settingsApi";
import PersonalizationDialog from "./PersonalizationDialog";
import { BackToSettings } from "./shared";

export default function UserManagement({ onBack, role }: { onBack: () => void; role: string }) {
  const canPersonalize = role === "admin" || role === "super_admin";
  const [personalizationUser, setPersonalizationUser] = useState<SettingsUser | null>(null);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
    organization: "",
    namespaces: [] as string[],
  });

  const load = useCallback(() => {
    return Promise.all([
      getUsers(), getOrganizations(), getRoles(),
      canPersonalize ? getPersonas().catch(() => ({ personas: [] as PersonaRecord[] })) : Promise.resolve({ personas: [] as PersonaRecord[] }),
    ])
      .then(
        ([userResult, organizationResult, roleResult, personaResult]) => {
          setError(null);
          setUsers(userResult.users);
          setOrganizations(organizationResult.organizations);
          setRoles(roleResult.roles);
          setPersonas(personaResult.personas);
        },
      )
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load user management.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canPersonalize]);

  // Assigning a persona writes one column; the reply echoes the user's
  // role and namespaces so the admin can see nothing else changed.
  async function changePersona(user: SettingsUser, personaId: string | null) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await assignUserPersona(user.id, personaId);
      const echoed = result.user;
      setNotice(
        `${result.persona ? `${result.persona.name} assigned to` : "Persona cleared for"} ${echoed.email}. ` +
        `Role ${echoed.role?.name || "unchanged"} and namespaces ${echoed.namespaces.map((n) => n.name).join(", ") || "unchanged"} were not touched.`,
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to assign persona.");
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    void load();
  }, [load]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.name === form.organization),
    [organizations, form.organization],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createUser(form);
      setForm({
        email: "",
        password: "",
        role: "",
        organization: "",
        namespaces: [],
      });
      setShowCreate(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to create user.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeUser(
    user: SettingsUser,
    patch: { role?: string; active?: boolean },
  ) {
    setSaving(true);
    setError(null);
    try {
      await updateUser(user.id, patch);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update user.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {personalizationUser && <PersonalizationDialog user={personalizationUser} onClose={() => setPersonalizationUser(null)} />}
        <BackToSettings onClick={onBack} />
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
              User Management
            </h2>
            <p className="mt-1 text-[14px] text-ink-muted">
              Create accounts and manage their roles and access status.
            </p>
          </div>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="rounded-lg bg-brand-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800"
          >
            {showCreate ? "Cancel" : "Add user"}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13.5px] text-emerald-800">
            {notice}
          </div>
        )}
        {showCreate && (
          <form
            onSubmit={submit}
            className="mb-5 grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-card sm:grid-cols-2"
          >
            <label className="text-[12px] font-semibold text-ink-muted">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-brand-100 px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand-500"
              />
            </label>
            <label className="text-[12px] font-semibold text-ink-muted">
              Temporary password
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-brand-100 px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand-500"
              />
            </label>
            <label className="text-[12px] font-semibold text-ink-muted">
              Role
              <select
                required
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-brand-100 px-3 py-2.5 text-[14px] text-ink"
              >
                <option value="">Select role</option>
                {roles.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-semibold text-ink-muted">
              Organization
              <select
                required
                value={form.organization}
                onChange={(event) =>
                  setForm({
                    ...form,
                    organization: event.target.value,
                    namespaces: [],
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-brand-100 px-3 py-2.5 text-[14px] text-ink"
              >
                <option value="">Select organization</option>
                {organizations.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-[12px] font-semibold text-ink-muted">
                Namespaces
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedOrganization?.namespaces.map((namespace) => (
                  <label
                    key={namespace.id}
                    className="flex items-center gap-2 rounded-lg border border-brand-100 px-3 py-2 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      checked={form.namespaces.includes(namespace.name)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          namespaces: event.target.checked
                            ? [...form.namespaces, namespace.name]
                            : form.namespaces.filter(
                                (name) => name !== namespace.name,
                              ),
                        })
                      }
                    />
                    {namespace.name}
                  </label>
                )) || (
                  <span className="text-[13px] text-ink-muted">
                    Select an organization first.
                  </span>
                )}
              </div>
            </fieldset>
            <div className="sm:col-span-2">
              <button
                disabled={saving || !form.namespaces.length}
                className="rounded-lg bg-brand-900 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        )}
        {loading ? (
          <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center text-ink-muted shadow-card">
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-card">
            <table className="w-full min-w-[820px] text-left text-[13.5px]">
              <thead className="bg-brand-50 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Namespaces</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  {canPersonalize && <th className="px-5 py-3">Persona</th>}
                  {canPersonalize && <th className="px-5 py-3">Personalization</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 font-medium text-ink">
                      {user.email}
                    </td>
                    <td className="px-5 py-4 text-ink-muted">
                      {user.organization?.name}
                    </td>
                    <td className="px-5 py-4 text-ink-muted">
                      {user.namespaces.map((item) => item.name).join(", ")}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        disabled={saving}
                        value={user.role?.name}
                        onChange={(event) =>
                          void changeUser(user, { role: event.target.value })
                        }
                        className="rounded-lg border border-brand-100 px-2.5 py-1.5"
                      >
                        {roles.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        disabled={saving}
                        onClick={() =>
                          void changeUser(user, { active: !user.active })
                        }
                        className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {canPersonalize && <td className="px-5 py-4">
                      <select
                        aria-label={`Persona for ${user.email}`}
                        disabled={saving || (role !== "super_admin" && user.role?.name === "super_admin")}
                        value={user.persona?.id || ""}
                        onChange={(event) => void changePersona(user, event.target.value || null)}
                        className="rounded-lg border border-brand-100 px-2.5 py-1.5 disabled:opacity-50"
                      >
                        <option value="">Namespace default</option>
                        {personas
                          .filter((p) => (p.is_active || p.id === user.persona?.id) && (p.shared || p.organization?.id === user.organization?.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.name}{p.is_active ? "" : " (inactive)"}</option>
                          ))}
                      </select>
                    </td>}
                    {canPersonalize && <td className="px-5 py-4">
                      <button onClick={() => setPersonalizationUser(user)}
                        disabled={role !== "super_admin" && user.role?.name === "super_admin"}
                        className="rounded-lg border border-brand-100 px-3 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 disabled:opacity-50">
                        Edit personalization
                      </button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

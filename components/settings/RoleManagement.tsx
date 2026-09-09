"use client";

import { useEffect, useState } from "react";
import {
  getRoles,
  getUsers,
  getOrganizations,
  updateUser,
  type RoleRecord,
  type SettingsUser,
  type OrganizationRecord,
} from "@/lib/settingsApi";
import { BackToSettings } from "./shared";

const label = (name: string) =>
  name.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const control =
  "rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm disabled:opacity-50";

export default function RoleManagement({
  role,
  currentOrganizationId,
  onBack,
}: {
  role: string;
  currentOrganizationId: string;
  onBack: () => void;
}) {
  const isSuperAdmin = role === "super_admin";
  const canManage = isSuperAdmin || role === "admin";
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [roleResult, userResult, organizationResult] = await Promise.all([
          getRoles(),
          canManage ? getUsers() : Promise.resolve({ users: [] }),
          isSuperAdmin
            ? getOrganizations()
            : Promise.resolve({ organizations: [] }),
        ]);
        if (cancelled) return;
        setRoles(roleResult.roles);
        setUsers(userResult.users);
        setOrganizations(organizationResult.organizations);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load role management.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canManage, isSuperAdmin, reload]);

  const scope = isSuperAdmin ? organizationId : currentOrganizationId;
  const scopedUsers = users.filter(
    (user) => Boolean(scope) && user.organization?.id === scope,
  );
  const visibleRoles = roles
    .filter((item) =>
      canManage
        ? isSuperAdmin || item.name !== "super_admin"
        : item.name === role,
    )
    .sort(
      (a, b) =>
        Number(b.name === "super_admin") - Number(a.name === "super_admin"),
    );
  const organizationRoles = visibleRoles.filter(
    (item) => item.name !== "super_admin",
  );
  const superAdminRole = roles.find((item) => item.name === "super_admin");
  const viewingSuperAdmins = isSuperAdmin && selectedRole === "super_admin";
  const members = (viewingSuperAdmins ? users : scopedUsers).filter(
    (user) =>
      (user.role?.name || "") === selectedRole &&
      user.email.toLowerCase().includes(query.toLowerCase()),
  );

  async function save(user: SettingsUser) {
    const nextRole = drafts[user.id];
    if (
      !nextRole ||
      saving ||
      !canManage ||
      (!isSuperAdmin && user.organization?.id !== scope) ||
      (!isSuperAdmin &&
        (nextRole === "super_admin" || user.role?.name === "super_admin"))
    )
      return;
    if (
      nextRole === "super_admin" &&
      !window.confirm(
        `Assign ${user.email} as a Super Admin? This grants access to all organizations and permission to manage users and roles across them.`,
      )
    )
      return;
    setSaving(true);
    setError(null);
    setNotice("");
    try {
      await updateUser(user.id, { role: nextRole });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, role: roles.find((item) => item.name === nextRole)! }
            : item,
        ),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setNotice(`${user.email} is now assigned to ${label(nextRole)}.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update role.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <BackToSettings onClick={onBack} />
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
            Role Management
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {canManage
              ? "Select a role to see its members and manage user assignments."
              : "Your role defines what you can access in Cortéx."}
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}{" "}
            <button
              className="underline"
              onClick={() => setReload((value) => value + 1)}
            >
              Reload
            </button>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
          >
            {notice}
          </div>
        )}
        {loading ? (
          <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center text-ink-muted">
            Loading roles…
          </div>
        ) : (
          <>
            {isSuperAdmin && superAdminRole && (
              <section className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Global access
                </h3>
                <button
                  disabled={saving}
                  aria-pressed={viewingSuperAdmins}
                  onClick={() => {
                    setSelectedRole("super_admin");
                    setQuery("");
                    setDrafts({});
                  }}
                  className={`w-full rounded-2xl border bg-slate-50 p-5 text-left shadow-card sm:max-w-md ${viewingSuperAdmins ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-300 hover:border-slate-500"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-extrabold text-slate-950">
                      Super Admin
                    </span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-900">
                      {
                        users.filter(
                          (user) => user.role?.name === "super_admin",
                        ).length
                      }{" "}
                      members
                    </span>
                  </span>
                  <span className="mt-2 block text-sm text-slate-700">
                    Access across all organizations. Membership is independent
                    of the organization selected below.
                  </span>
                  {superAdminRole.description && (
                    <span className="mt-2 block text-sm text-ink-muted">
                      {superAdminRole.description}
                    </span>
                  )}
                </button>
              </section>
            )}
            {isSuperAdmin && (
              <label className="mb-6 block text-sm font-medium text-brand-900">
                Organization roles
                <select
                  disabled={saving}
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setSelectedRole((current) =>
                      current === "super_admin" ? current : "",
                    );
                    setDrafts({});
                    setQuery("");
                    setNotice("");
                  }}
                  className={`${control} mt-2 block w-full sm:max-w-md`}
                >
                  <option value="">Select an organization</option>
                  {organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canManage && !scope ? (
              <p className="rounded-xl border border-brand-100 bg-white p-6 text-ink-muted">
                {isSuperAdmin
                  ? "Choose an organization to manage its role assignments."
                  : "Your account needs an organization before you can manage role assignments."}
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {organizationRoles.map((item) => {
                    const content = (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <h3
                            className={
                              item.name === "super_admin"
                                ? "font-extrabold text-slate-950"
                                : "font-semibold text-brand-900"
                            }
                          >
                            {label(item.name)}
                          </h3>
                          {canManage ? (
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
                              {
                                scopedUsers.filter(
                                  (user) => user.role?.name === item.name,
                                ).length
                              }{" "}
                              members
                            </span>
                          ) : (
                            <span className="text-xs text-brand-700">
                              Your role
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-5 text-ink-muted">
                          {item.description ||
                            "No description has been provided."}
                        </p>
                      </>
                    );
                    return canManage ? (
                      <button
                        key={item.id}
                        disabled={saving}
                        aria-pressed={selectedRole === item.name}
                        onClick={() => {
                          setSelectedRole(item.name);
                          setQuery("");
                          setDrafts({});
                        }}
                        className={`rounded-2xl border bg-white p-5 text-left shadow-card transition hover:border-brand-400 ${selectedRole === item.name ? "border-brand-500 ring-1 ring-brand-500" : "border-brand-100"}`}
                      >
                        {content}
                      </button>
                    ) : (
                      <section
                        key={item.id}
                        className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card"
                      >
                        {content}
                      </section>
                    );
                  })}
                  {canManage && (
                    <button
                      disabled={saving}
                      aria-pressed={selectedRole === ""}
                      onClick={() => {
                        setSelectedRole("");
                        setQuery("");
                        setDrafts({});
                      }}
                      className={`rounded-2xl border bg-white p-5 text-left shadow-card ${selectedRole === "" ? "border-brand-500 ring-1 ring-brand-500" : "border-brand-100"}`}
                    >
                      <h3 className="font-semibold text-brand-900">
                        Unassigned{" "}
                        <span className="ml-2 text-xs font-normal">
                          {
                            scopedUsers.filter((user) => !user.role?.name)
                              .length
                          }{" "}
                          users
                        </span>
                      </h3>
                      <p className="mt-2 text-sm text-ink-muted">
                        Unassigned Users
                      </p>
                    </button>
                  )}
                </div>
                {!canManage && visibleRoles.length === 0 && (
                  <p className="rounded-xl border border-brand-100 bg-white p-6 text-ink-muted">
                    {role
                      ? `Your role: ${label(role)}. No description is available.`
                      : "You do not have a role assigned. Contact your organization administrator."}
                  </p>
                )}
              </>
            )}
            {canManage && (viewingSuperAdmins || Boolean(scope)) && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 p-5">
                  <div>
                    <h3 className="font-semibold text-brand-900">
                      {selectedRole ? label(selectedRole) : "Unassigned"} users
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {viewingSuperAdmins
                        ? "Super admins across all organizations. Choose a new role, then save the assignment."
                        : "Choose a new role, then save the assignment."}
                    </p>
                  </div>
                  <input
                    aria-label="Search users by email"
                    type="search"
                    placeholder="Search by email"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={control}
                  />
                </div>
                {members.length === 0 ? (
                  <p className="p-6 text-sm text-ink-muted">
                    {query
                      ? "No users match your search."
                      : "No users in this group."}
                  </p>
                ) : (
                  <ul className="divide-y divide-brand-100">
                    {members.map((user) => (
                      <li
                        key={user.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-5"
                      >
                        <div className="min-w-0">
                          <p className="break-all text-sm font-medium text-brand-900">
                            {user.email}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {user.active ? "Active" : "Inactive"} ·{" "}
                            {user.role?.name
                              ? label(user.role.name)
                              : "No role assigned"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <select
                            aria-label={`Role for ${user.email}`}
                            disabled={saving}
                            value={drafts[user.id] ?? user.role?.name ?? ""}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                            className={control}
                          >
                            <option value="" disabled>
                              Select a role
                            </option>
                            {visibleRoles.map((item) => (
                              <option key={item.id} value={item.name}>
                                {label(item.name)}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={
                              saving ||
                              !drafts[user.id] ||
                              drafts[user.id] === user.role?.name
                            }
                            onClick={() => void save(user)}
                            className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

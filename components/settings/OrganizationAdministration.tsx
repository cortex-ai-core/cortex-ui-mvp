"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  addNamespaceUser,
  createNamespace,
  createOrganization,
  getNamespaceUsers,
  getOrganizations,
  getUsers,
  removeNamespaceUser,
  updateNamespace,
  updateOrganization,
  type NamespaceRecord,
  type OrganizationRecord,
  type SettingsUser,
} from "@/lib/settingsApi";
import { BackToSettings } from "./shared";

type OrganizationForm = { id?: string; name: string; description: string };
type NamespaceForm = {
  organizationId: string;
  id?: string;
  name: string;
  description: string;
};
type Selection = {
  organization: OrganizationRecord;
  namespace: NamespaceRecord;
};

export default function OrganizationAdministration({
  role,
  currentOrganizationId,
  currentNamespace,
  onBack,
}: {
  role: string;
  currentOrganizationId: string;
  currentNamespace: string;
  onBack: () => void;
}) {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [allUsers, setAllUsers] = useState<SettingsUser[]>([]);
  const [members, setMembers] = useState<SettingsUser[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showOrganizations, setShowOrganizations] = useState(true);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationForm | null>(null);
  const [namespaceForm, setNamespaceForm] = useState<NamespaceForm | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const namespaceEditorRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    return Promise.all([getOrganizations(), getUsers()])
      .then(
        ([organizationResult, userResult]) => {
          setError(null);
          setOrganizations(organizationResult.organizations);
          setAllUsers(userResult.users);
          setExpanded((current) =>
            current.size
              ? current
              : new Set(organizationResult.organizations.map((item) => item.id)),
          );
        },
      )
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load organization settings.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const availableUsers = useMemo(() => {
    if (!selected) return [];
    const memberIds = new Set(members.map((user) => user.id));
    return allUsers.filter(
      (user) =>
        user.organization?.id === selected.organization.id &&
        !memberIds.has(user.id),
    );
  }, [allUsers, members, selected]);

  async function openNamespace(target: Selection) {
    setSelected(target);
    setSelectedUserId("");
    setShowOrganizations(false);
    setError(null);
    try {
      setMembers((await getNamespaceUsers(target.namespace.id)).users);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load namespace users.",
      );
    }
  }

  async function saveOrganization(event: FormEvent) {
    event.preventDefault();
    if (!organizationForm) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: organizationForm.name,
        description: organizationForm.description,
      };
      if (organizationForm.id)
        await updateOrganization(organizationForm.id, input);
      else await createOrganization(input);
      setOrganizationForm(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save organization.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveNamespace(event: FormEvent) {
    event.preventDefault();
    if (!namespaceForm) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: namespaceForm.name,
        description: namespaceForm.description,
      };
      if (namespaceForm.id)
        await updateNamespace(
          namespaceForm.organizationId,
          namespaceForm.id,
          input,
        );
      else await createNamespace(namespaceForm.organizationId, input);
      setNamespaceForm(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save namespace.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addMember() {
    if (!selected || !selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      await addNamespaceUser(selected.namespace.id, selectedUserId);
      await openNamespace(selected);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add namespace user.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId: string) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await removeNamespaceUser(selected.namespace.id, userId);
      await openNamespace(selected);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove namespace user.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleOrganization(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function beginEditNamespace(
    organization: OrganizationRecord,
    namespace: NamespaceRecord,
  ) {
    setShowOrganizations(true);
    setExpanded(new Set([organization.id]));
    setOrganizationForm(null);
    setNamespaceForm({
      organizationId: organization.id,
      id: namespace.id,
      name: namespace.name,
      description: namespace.description || "",
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() =>
        namespaceEditorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    });
  }

  function beginAddNamespace(organization: OrganizationRecord) {
    setShowOrganizations(true);
    setExpanded(new Set([organization.id]));
    setOrganizationForm(null);
    setNamespaceForm({
      organizationId: organization.id,
      name: "",
      description: "",
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() =>
        namespaceEditorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    });
  }

  function closeUserManagement() {
    setSelected(null);
    setMembers([]);
    setSelectedUserId("");
    setShowOrganizations(true);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <BackToSettings onClick={onBack} />
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-brand-100 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                Organization management
              </div>
              <h2 className="text-xl font-semibold text-brand-900">
                Organizations and namespaces
              </h2>
              <p className="mt-1 text-[13.5px] text-ink-muted">
                {role === "super_admin"
                  ? "Manage every organization and its namespaces."
                  : "Manage your organization and its namespaces."}
              </p>
            </div>
            <div className="flex gap-2">
              {selected && (
                <button
                  onClick={closeUserManagement}
                  className="rounded-lg border border-brand-100 px-3 py-2 text-[12px] font-medium text-brand-700"
                >
                  Show organizations
                </button>
              )}
              {role === "super_admin" && (
                <button
                  onClick={() => {
                    setOrganizationForm({ name: "", description: "" });
                    setShowOrganizations(true);
                  }}
                  className="rounded-lg bg-brand-900 px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Add organization
                </button>
              )}
            </div>
          </div>

          {showOrganizations && (
            <div className="border-t border-brand-100 bg-brand-50/40 p-4 sm:p-5">
              {organizationForm && (
                <Editor
                  title={
                    organizationForm.id
                      ? "Edit organization"
                      : "Add organization"
                  }
                  name={organizationForm.name}
                  description={organizationForm.description}
                  saving={saving}
                  onName={(name) =>
                    setOrganizationForm({ ...organizationForm, name })
                  }
                  onDescription={(description) =>
                    setOrganizationForm({ ...organizationForm, description })
                  }
                  onCancel={() => setOrganizationForm(null)}
                  onSubmit={saveOrganization}
                />
              )}
              {namespaceForm && (
                <div ref={namespaceEditorRef} className="scroll-mt-4">
                  <Editor
                    title={
                      namespaceForm.id ? "Edit namespace" : "Add namespace"
                    }
                    name={namespaceForm.name}
                    description={namespaceForm.description}
                    saving={saving}
                    onName={(name) =>
                      setNamespaceForm({ ...namespaceForm, name })
                    }
                    onDescription={(description) =>
                      setNamespaceForm({ ...namespaceForm, description })
                    }
                    onCancel={() => setNamespaceForm(null)}
                    onSubmit={saveNamespace}
                  />
                </div>
              )}
              {loading ? (
                <div className="p-6 text-center text-ink-muted">
                  Loading organizations…
                </div>
              ) : (
                <div className="space-y-3">
                  {organizations.map((organization) => {
                    const isExpanded = expanded.has(organization.id);
                    return (
                      <div
                        key={organization.id}
                        className="overflow-hidden rounded-xl border border-brand-100 bg-white"
                      >
                        <div className="flex items-center gap-3 border-l-4 border-brand-600 p-4">
                          <button
                            onClick={() => toggleOrganization(organization.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span
                              className={`text-brand-600 transition ${isExpanded ? "rotate-90" : ""}`}
                            >
                              ›
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                                Organization
                              </span>
                              <span className="block font-semibold text-brand-900">
                                {organization.name}
                              </span>
                              <span className="block truncate text-[12px] text-ink-muted">
                                {organization.namespaces.length} namespace
                                {organization.namespaces.length === 1
                                  ? ""
                                  : "s"}
                                {organization.description
                                  ? ` · ${organization.description}`
                                  : ""}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => beginAddNamespace(organization)}
                            className="rounded-lg border border-brand-100 px-3 py-1.5 text-[12px] font-medium text-brand-700"
                          >
                            Add namespace
                          </button>
                          <button
                            onClick={() =>
                              setOrganizationForm({
                                id: organization.id,
                                name: organization.name,
                                description: organization.description || "",
                              })
                            }
                            className="rounded-lg border border-brand-100 px-3 py-1.5 text-[12px] font-medium text-brand-700"
                          >
                            Edit org
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="grid gap-3 border-t border-brand-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            {organization.namespaces.map((namespace) => {
                              const current =
                                organization.id === currentOrganizationId &&
                                namespace.name.toLowerCase() ===
                                  currentNamespace.toLowerCase();
                              return (
                                <div
                                  key={namespace.id}
                                  className={`rounded-xl border p-4 ${current ? "border-brand-500 bg-brand-50" : "border-brand-100"}`}
                                >
                                  <button
                                    onClick={() =>
                                      void openNamespace({
                                        organization,
                                        namespace,
                                      })
                                    }
                                    className="w-full text-left"
                                  >
                                    <div className="mb-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                                      {organization.name}
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span>
                                        <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                                          Namespace
                                        </span>
                                        <span className="font-semibold text-brand-900">
                                          {namespace.name}
                                        </span>
                                      </span>
                                      {current && (
                                        <span className="text-[10px] font-semibold uppercase text-brand-700">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-[12px] text-ink-muted">
                                      Manage users →
                                    </p>
                                  </button>
                                  <button
                                    onClick={() =>
                                      beginEditNamespace(
                                        organization,
                                        namespace,
                                      )
                                    }
                                    className="mt-3 text-[11px] font-medium text-brand-600"
                                  >
                                    Edit namespace
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {selected && (
          <section className="mt-6 rounded-2xl border-2 border-brand-200 bg-white shadow-card">
            <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 p-5 pr-14 sm:p-6 sm:pr-16">
              <button
                onClick={closeUserManagement}
                aria-label="Close user management and show organizations"
                title="Show organizations"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-brand-100 text-lg leading-none text-ink-muted transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-900"
              >
                ×
              </button>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                  Namespace user management
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                  <span className="rounded-lg bg-brand-900 px-3 py-1.5 text-white">
                    {selected.organization.name}
                  </span>
                  <span className="text-brand-300">→</span>
                  <span className="text-brand-900">
                    {selected.namespace.name}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-ink-muted">
                  Add or remove access to this namespace within{" "}
                  {selected.organization.name}.
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="rounded-lg border border-brand-100 px-3 py-2 text-[13px]"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!selectedUserId || saving}
                  onClick={() => void addMember()}
                  className="rounded-lg bg-brand-900 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  Add user
                </button>
              </div>
            </div>
            <div className="divide-y divide-brand-100">
              {members.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div>
                    <div className="text-[13.5px] font-medium text-ink">
                      {user.email}
                    </div>
                    <div className="text-[12px] text-ink-muted">
                      {user.role?.name}
                    </div>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => void removeMember(user.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="p-5 text-[13.5px] text-ink-muted">
                  No users are assigned to this namespace.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Editor({
  title,
  name,
  description,
  saving,
  onName,
  onDescription,
  onCancel,
  onSubmit,
}: {
  title: string;
  name: string;
  description: string;
  saving: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-xl border border-brand-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-brand-900">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-ink-muted"
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-semibold text-ink-muted">
          Name
          <input
            required
            value={name}
            onChange={(event) => onName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-100 px-3 py-2 text-[14px] text-ink"
          />
        </label>
        <label className="text-[12px] font-semibold text-ink-muted">
          Description
          <input
            value={description}
            onChange={(event) => onDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-100 px-3 py-2 text-[14px] text-ink"
          />
        </label>
      </div>
      <button
        disabled={saving}
        className="mt-3 rounded-lg bg-brand-900 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

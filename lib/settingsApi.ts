import type { ToneMode } from "./chatStore";
import { BACKEND, ApiError } from "./documentsApi";

export type NamespaceRecord = {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string;
  /** persona for members with no assignment of their own; null = built-in default */
  default_persona_id?: string | null;
};
export type OrganizationRecord = {
  id: string;
  name: string;
  description?: string | null;
  namespaces: NamespaceRecord[];
};
export type RoleRecord = {
  id: string;
  name: string;
  description?: string | null;
};
export type SettingsUser = {
  id: string;
  auth_user_id?: string;
  email: string;
  active: boolean;
  role: RoleRecord | null;
  organization: Pick<OrganizationRecord, "id" | "name">;
  namespaces: NamespaceRecord[];
  /** the persona assigned to this user, or null for the namespace default */
  persona?: PersonaSummary | null;
};

export type PersonaSummary = { id: string; key: string; name: string };

/** A request the server refused with a list of validation errors. */
export class ValidationError extends ApiError {
  errors: string[];
  warnings: string[];
  constructor(message: string, status: number, errors: string[], warnings: string[] = []) {
    super(message, status);
    this.name = "ValidationError";
    this.errors = errors;
    this.warnings = warnings;
  }
}

function authToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${authToken()}`,
    },
  });
  const body =
    response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error || `Request failed (${response.status})`;
    if (Array.isArray(body?.errors))
      throw new ValidationError(message, response.status, body.errors, Array.isArray(body?.warnings) ? body.warnings : []);
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const getOrganizations = () =>
  request<{ organizations: OrganizationRecord[] }>(
    "/api/settings/organizations",
  );
export const getRoles = () =>
  request<{ roles: RoleRecord[] }>("/api/settings/roles");
export const getUsers = () =>
  request<{ users: SettingsUser[] }>("/api/settings/users");
export const getCurrentUserSettings = () =>
  request<{ user: SettingsUser }>("/api/settings/user");
export const getNamespaceUsers = (namespaceId: string) =>
  request<{ users: SettingsUser[] }>(
    `/api/settings/namespaces/${namespaceId}/users`,
  );

export function createOrganization(input: {
  name: string;
  description?: string;
}) {
  return request<{ organization: OrganizationRecord }>(
    "/api/settings/organizations",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateOrganization(
  id: string,
  patch: { name?: string; description?: string },
) {
  return request<{ organization: OrganizationRecord }>(
    `/api/settings/organizations/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function createNamespace(
  organizationId: string,
  input: { name: string; description?: string },
) {
  return request<{ namespace: NamespaceRecord }>(
    `/api/settings/organizations/${organizationId}/namespaces`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateNamespace(
  organizationId: string,
  namespaceId: string,
  patch: { name?: string; description?: string },
) {
  return request<{ namespace: NamespaceRecord }>(
    `/api/settings/organizations/${organizationId}/namespaces/${namespaceId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function addNamespaceUser(namespaceId: string, userId: string) {
  return request(`/api/settings/namespaces/${namespaceId}/users`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeNamespaceUser(namespaceId: string, userId: string) {
  return request(`/api/settings/namespaces/${namespaceId}/users/${userId}`, {
    method: "DELETE",
  });
}

export function createUser(input: {
  email: string;
  password: string;
  role: string;
  organization: string;
  namespaces: string[];
}) {
  return request<{ user: SettingsUser }>("/api/settings/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUser(
  id: string,
  patch: { role?: string; active?: boolean },
) {
  return request<{ user: Partial<SettingsUser> }>(`/api/settings/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function replaceUserNamespaces(id: string, namespaceIds: string[]) {
  return request<{ userId: string; namespaces: NamespaceRecord[] }>(
    `/api/settings/users/${id}/namespaces`,
    { method: "PUT", body: JSON.stringify({ namespaceIds }) },
  );
}

export type UserPreferences = { response_style: ToneMode; personalization: string };

export const getUserPreferences = () =>
  request<{ preferences: UserPreferences }>("/api/settings/user/preferences");

export const saveUserPreferences = (responseStyle: ToneMode) =>
  request<{ preferences: UserPreferences }>("/api/settings/user/preferences", {
    method: "PATCH",
    body: JSON.stringify({ response_style: responseStyle }),
  });

export const getPersonalization = async () => {
  const { preferences } = await getUserPreferences();
  return { personalization: preferences.personalization ?? "" };
};

export const savePersonalization = async (personalization: string) => {
  const { preferences } = await request<{ preferences: UserPreferences }>(
    "/api/settings/user/preferences", {
      method: "PATCH", body: JSON.stringify({ personalization }),
    },
  );
  return { personalization: preferences.personalization };
};

export const getUserPersonalization = (userId: string) =>
  request<{ personalization: string }>(`/api/settings/users/${encodeURIComponent(userId)}/personalization`);

export const saveUserPersonalization = (userId: string, personalization: string) =>
  request<{ personalization: string }>(`/api/settings/users/${encodeURIComponent(userId)}/personalization`, {
    method: "PATCH", body: JSON.stringify({ personalization }),
  });

// ---------------------------------------------------------------
// Personas and PCL (spec 4.4). Rules live as an append-only version
// history; saving a new version validates first and inserts nothing on
// failure, which arrives here as a ValidationError with its errors.
// ---------------------------------------------------------------
export type PersonaLength = "concise" | "standard" | "detailed";
export const PERSONA_LIST_SECTIONS = [
  "operating_instructions",
  "evaluation_rules",
  "evidence_requirements",
  "decision_rules",
  "formatting",
  "output_structure",
  "workflow",
  "domain_instructions",
  "required",
  "prohibited",
] as const;
export type PersonaListSection = (typeof PERSONA_LIST_SECTIONS)[number];
export type PersonaConfiguration = Partial<Record<PersonaListSection, string[]>> & {
  schema?: 1;
  identity?: { text?: string };
  response?: { style?: ToneMode; length?: PersonaLength };
  terminology?: { prefer?: Record<string, string>; protect?: string[] };
  lock_style?: boolean;
};
export type PersonaVersion = {
  id: string;
  version: number;
  configuration: PersonaConfiguration;
  created_by: string | null;
  created_at: string;
};
export type PersonaRecord = PersonaSummary & {
  description: string | null;
  is_active: boolean;
  shared: boolean;
  organization: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  current_version: { version: number; created_by: string | null; created_at: string } | null;
  users: number;
  namespaces: number;
};
export type PersonaPreview = {
  user: { id: string; email: string; role: string | null; organization: { id: string; name: string } | null; namespace: NamespaceRecord | null };
  source: "resolved" | "default";
  reason: string | null;
  persona: PersonaSummary | null;
  persona_source: "user" | "namespace" | "none";
  version: number | null;
  style: string;
  style_source: string;
  personalization: string;
  rendered: { persona?: string | null; structureRules?: string | null; task?: string | null; rules?: string | null; terminology?: string | null; personalization?: string | null } | null;
};

export const getPersonas = () =>
  request<{ personas: PersonaRecord[] }>("/api/settings/personas");

export const createPersona = (input: { key: string; name: string; description?: string; configuration?: PersonaConfiguration; shared?: boolean }) =>
  request<{ persona: PersonaRecord; version: PersonaVersion; warnings: string[] }>("/api/settings/personas", {
    method: "POST", body: JSON.stringify(input),
  });

export const updatePersona = (id: string, patch: { name?: string; description?: string }) =>
  request<{ persona: PersonaRecord }>(`/api/settings/personas/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });

export const getPersonaVersions = (id: string) =>
  request<{ persona: PersonaRecord; versions: PersonaVersion[] }>(`/api/settings/personas/${encodeURIComponent(id)}/versions`);

export const savePersonaVersion = (id: string, configuration: PersonaConfiguration) =>
  request<{ persona: PersonaRecord; version: PersonaVersion; warnings: string[] }>(`/api/settings/personas/${encodeURIComponent(id)}/versions`, {
    method: "POST", body: JSON.stringify({ configuration }),
  });

export const activatePersona = (id: string) =>
  request<{ persona: PersonaRecord }>(`/api/settings/personas/${encodeURIComponent(id)}/activate`, { method: "POST", body: "{}" });

export const deactivatePersona = (id: string) =>
  request<{ persona: PersonaRecord; namespaces?: NamespaceRecord[] }>(`/api/settings/personas/${encodeURIComponent(id)}/deactivate`, { method: "POST", body: "{}" });

export const assignUserPersona = (userId: string, personaId: string | null) =>
  request<{ user: SettingsUser; persona: PersonaSummary | null }>(`/api/settings/users/${encodeURIComponent(userId)}/persona`, {
    method: "PATCH", body: JSON.stringify({ persona_id: personaId }),
  });

export const setNamespacePersona = (namespaceId: string, personaId: string | null) =>
  request<{ namespace: NamespaceRecord & { default_persona: PersonaSummary | null } }>(`/api/settings/namespaces/${encodeURIComponent(namespaceId)}/persona`, {
    method: "PATCH", body: JSON.stringify({ persona_id: personaId }),
  });

export const previewPersona = (userId: string, namespaceId?: string) =>
  request<PersonaPreview>(`/api/settings/personas/preview?userId=${encodeURIComponent(userId)}${namespaceId ? `&namespaceId=${encodeURIComponent(namespaceId)}` : ""}`);

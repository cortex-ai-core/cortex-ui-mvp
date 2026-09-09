import type { ToneMode } from "./chatStore";
import { BACKEND, ApiError } from "./documentsApi";

export type NamespaceRecord = {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string;
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
};

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
  if (!response.ok)
    throw new ApiError(
      body?.error || `Request failed (${response.status})`,
      response.status,
    );
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

export type UserPreferences = { response_style: ToneMode };

export const getUserPreferences = () =>
  request<{ preferences: UserPreferences }>("/api/settings/user/preferences");

export const saveUserPreferences = (responseStyle: ToneMode) =>
  request<{ preferences: UserPreferences }>("/api/settings/user/preferences", {
    method: "PATCH",
    body: JSON.stringify({ response_style: responseStyle }),
  });

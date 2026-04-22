const permissions = {
  super_admin: [
    "upload_documents",
    "upload_persistent",
    "upload_ephemeral",
    "delete_documents",
    "manage_users",
    "view_documents"
  ],

  admin: [
    "upload_documents",
    "upload_persistent",
    "upload_ephemeral",
    "delete_documents",
    "view_documents"
  ],

  operator: [
    "upload_ephemeral",
    "view_documents"
  ],

  viewer: [
    "view_documents"
  ],

  client: []
};

export function hasPermission(role: string, permission: string) {
  return (permissions as any)[role]?.includes(permission) ?? false; // ✅ FIXED
}

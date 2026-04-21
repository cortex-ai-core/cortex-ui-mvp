export const ROLE_PERMISSIONS = {
  super_admin: {
    upload_persistent: true,
    upload_ephemeral: true,
    delete_documents: true,
    view_admin_console: true,
    view_audit_logs: true,
    manage_users: true,
  },
  admin: {
    upload_persistent: true,
    upload_ephemeral: true,
    delete_documents: true,
    view_admin_console: true,
    view_audit_logs: true,
    manage_users: true,
  },
  operator: {
    upload_persistent: true,
    upload_ephemeral: true,
    delete_documents: false,
    view_admin_console: false,
    view_audit_logs: false,
    manage_users: false,
  },
  viewer: {
    upload_persistent: false,
    upload_ephemeral: false,
    delete_documents: false,
    view_admin_console: false,
    view_audit_logs: false,
    manage_users: false,
  },
  client: {
    upload_persistent: false,
    upload_ephemeral: false,
    delete_documents: false,
    view_admin_console: false,
    view_audit_logs: false,
    manage_users: false,
  }
};


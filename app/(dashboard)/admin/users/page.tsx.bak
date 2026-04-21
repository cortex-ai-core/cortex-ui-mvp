"use client";

import { useEffect, useState } from "react";
import styles from "../../../ui.module.css";
import { requireAuth } from "@/lib/auth/requireAuth";
import { hasPermission } from "@/lib/auth/hasPermission";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UserAdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Available roles
  const ROLE_OPTIONS = [
    "super_admin",
    "admin",
    "operator",
    "viewer",
    "client",
  ];

  // ============================================================
  // AUTH + RBAC PROTECTION
  // ============================================================
  useEffect(() => {
    async function load() {
      const authUser = await requireAuth();
      setUser(authUser);

      // RBAC: Only super_admin can view this page
      const role = authUser?.user_metadata?.role;
      if (role !== "super_admin") {
        router.push("/chat");
        return;
      }

      // Fetch users directly from Supabase Auth schema
      const { data: userList, error } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error("User fetch error:", error);
      } else {
        setUsers(userList.users || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function updateRole(userId: string, newRole: string) {
    try {
      setUpdatingId(userId);

      // Apply role update
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole },
      });

      if (error) {
        console.error("Role update error:", error);
      }

      // Refresh list
      const { data: refreshed, error: refreshErr } =
        await supabase.auth.admin.listUsers();

      if (!refreshErr) {
        setUsers(refreshed.users || []);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <div className={styles.loadingContainer}>Loading users…</div>;
  }

  // ============================================================
  // UI RENDER
  // ============================================================
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>User Management</h1>
      <p className={styles.pageSubtitle}>
        View and manage roles assigned to each Cortéx user.
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  No users found.
                </td>
              </tr>
            )}

            {users.map((u) => {
              const currentRole = u.user_metadata?.role ?? "client";

              return (
                <tr key={u.id} className={styles.tableRow}>
                  <td>{u.email}</td>

                  <td>
                    <select
                      value={currentRole}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={updatingId === u.id}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>{new Date(u.created_at).toLocaleString()}</td>

                  <td>
                    {updatingId === u.id ? (
                      <span>Saving…</span>
                    ) : (
                      <span>Updated</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

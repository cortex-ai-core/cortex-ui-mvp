"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import styles from "../../../ui.module.css";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UserAdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ROLE_OPTIONS = [
    "super_admin",
    "admin",
    "operator",
    "viewer",
    "client",
  ];

  useEffect(() => {
    async function load() {
      const authUser = await requireAuth();
      setUser(authUser);

      const role = (authUser as any)?.user_metadata?.role;
      if (role !== "super_admin") {
        router.push("/chat");
        return;
      }

      // 🔥 TEMP FIX: REMOVE ADMIN CALL (causes crash)
      setUsers([]);

      setLoading(false);
    }

    load();
  }, []);

  // 🔥 TEMP DISABLE UPDATE (also uses admin API)
  async function updateRole(userId: string, newRole: string) {
    console.warn("updateRole disabled in client (requires server API)");
  }

  if (loading) {
    return <div className={styles.loadingContainer}>Loading users…</div>;
  }

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
              const currentRole =
                (u as any)?.user_metadata?.role ?? "client";

              return (
                <tr key={u.id} className={styles.tableRow}>
                  <td>{u.email}</td>

                  <td>
                    <select
                      value={currentRole}
                      onChange={(e) =>
                        updateRole(u.id, e.target.value)
                      }
                      disabled={true} // 🔥 disable for now
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    {new Date((u as any).created_at).toLocaleString()}
                  </td>

                  <td>
                    <span>Disabled</span>
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

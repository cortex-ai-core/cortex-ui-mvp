"use client";

import { useEffect, useState } from "react";
import styles from "../../ui.module.css";
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

  useEffect(() => {
    async function load() {
      const authUser = (await requireAuth()) as any; // ✅ FIXED (type cast)

      setUser(authUser);

      // RBAC: Only super_admin can view this page
      const role = (authUser as any)?.user_metadata?.role; // ✅ reinforced
      if (role !== "super_admin") {
        router.push("/chat");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("User fetch error:", error);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <div className={styles.loadingContainer}>Loading users…</div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>User Management</h1>
      <p className={styles.pageSubtitle}>
        View all users connected to your Cortéx instance.
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Last Login</th>
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

            {users.map((u: any) => (
              <tr key={u.id} className={styles.tableRow}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{new Date((u as any).created_at).toLocaleString()}</td>
                <td>
                  {u.last_login_at
                    ? new Date((u as any).last_login_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

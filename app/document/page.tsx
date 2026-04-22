"use client";

import { useEffect, useState } from "react";
import styles from "../ui.module.css";
import { requireAuth } from "@/lib/auth/requireAuth";
import { hasPermission } from "@/lib/auth/hasPermission";
import { createClient } from "@/lib/supabase/client";

export default function DocumentsPage() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ============================================================
  // LOAD USER + DOCUMENTS (44C — Ownership Logic)
  // ============================================================
  useEffect(() => {
    async function load() {
      const authUser = (await requireAuth()) as any; // ✅ FIXED
      setUser(authUser);

      const userRole = (authUser as any)?.user_metadata?.role; // ✅ FIXED

      let query = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      // Ownership enforcement:
      // Clients only see THEIR OWN documents.
      if (userRole === "client") {
        query = query.eq("user_id", (authUser as any).id); // ✅ FIXED
      }

      const { data, error } = await query;

      if (error) {
        console.error("Document fetch error:", error);
      } else {
        setDocs(data || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  // ============================================================
  // DELETE HANDLER (FIXED → BACKEND ROUTE)
  // ============================================================
  async function handleDeleteClick(doc: any) {
    const confirmed = window.confirm(
      `Delete "${doc.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(doc.id);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert("Delete failed: " + data.error);
        setDeletingId(null);
        return;
      }

      // Remove from UI immediately
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));

    } catch (err) {
      alert("Delete failed due to a network error.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>Loading documents…</div>
    );
  }

  // ============================================================
  // UI RENDER
  // ============================================================
  return (
    <div className={styles.page}>
      
      <h1 className={styles.pageTitle}>Documents</h1>
      <p className={styles.pageSubtitle}>
        Persistent uploads available to Cortéx intelligence.
      </p>

      {user && hasPermission(user.role, "upload_documents") && (
        <div className={styles.uploadArea}>
          <p className={styles.uploadLabel}>Upload new document</p>
          <input type="file" />
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Type</th>
              <th>Uploaded</th>
              <th style={{ width: 90 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No documents found.
                </td>
              </tr>
            )}

            {docs.map((doc) => (
              <tr key={doc.id} className={styles.tableRow}>
                <td>{doc.name}</td>
                <td>{doc.namespace}</td>
                <td>{doc.type}</td>
                <td>{new Date(doc.created_at).toLocaleString()}</td>

                <td>
                  {user && hasPermission(user.role, "delete_documents") ? (
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteClick(doc)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? "Deleting…" : "🗑 Delete"}
                    </button>
                  ) : (
                    <span className={styles.noAction}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

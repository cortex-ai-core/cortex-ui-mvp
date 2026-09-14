"use client";

import { useCallback, useEffect, useState } from "react";
import DocumentTypesSettings from "@/components/DocumentTypesSettings";
import { listDocumentTypes, type DocumentType } from "@/lib/documentsApi";

/**
 * The organization's document types, inside its card on the Organizations
 * page. Loads the list for that organization (a super admin may be looking
 * at an organization other than their own) and tells the chat client when
 * it changes so the upload form's menu follows.
 */
export default function DocumentTypesPanel({
  organization,
  onChanged,
}: {
  organization: { id: string; name: string };
  onChanged?: () => void;
}) {
  const [types, setTypes] = useState<DocumentType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listDocumentTypes(organization.id);
      setTypes(r.types || []);
      setError(null);
    } catch (reason) {
      const status = (reason as { status?: number })?.status;
      setError(status === 404 ? "the backend you are connected to doesn't have this route yet. Restart it on the current code." : reason instanceof Error ? reason.message : "unable to load.");
      setTypes([]);
    }
  }, [organization.id]);

  useEffect(() => { void load(); }, [load]);

  if (error) {
    return <div className="border-t border-brand-100 px-4 py-3 text-[12px] text-ink-muted">Document types: {error}</div>;
  }
  if (types === null) {
    return <div className="border-t border-brand-100 px-4 py-3 text-[12px] text-ink-muted">Loading document types…</div>;
  }
  return (
    <div className="border-t border-brand-100 p-4">
      <DocumentTypesSettings
        embedded
        types={types}
        canManage
        organizationId={organization.id}
        onChanged={() => { void load(); onChanged?.(); }}
      />
    </div>
  );
}

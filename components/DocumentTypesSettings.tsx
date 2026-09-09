"use client";

import { useState } from "react";
import {
  type DocumentType,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from "@/lib/documentsApi";
import { IconPlus, IconSpinner, IconTrash, IconX } from "./icons";
import { useDialog } from "./Dialog";

type Props = {
  types: DocumentType[];
  canManage: boolean;
  onChanged: () => void;
};

export default function DocumentTypesSettings({
  types,
  canManage,
  onChanged,
}: Props) {
  const dialog = useDialog();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  const add = async () => {
    if (!name.trim()) return;
    setBusy("new");
    setError(null);
    try {
      await createDocumentType({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onChanged();
    } catch (e: unknown) {
      setError(
        e instanceof Error && e.message ? e.message : "Couldn't add the type.",
      );
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(editing.id);
    setError(null);
    try {
      await updateDocumentType(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim(),
      });
      setEditing(null);
      onChanged();
    } catch (e: unknown) {
      setError(
        e instanceof Error && e.message ? e.message : "Couldn't save the type.",
      );
    } finally {
      setBusy(null);
    }
  };

  const remove = async (t: DocumentType) => {
    const ok = await dialog.confirm({
      title: `Delete the type "${t.name}"?`,
      message: "Documents keep their files; they just lose this label.",
      confirmLabel: "Delete type",
      danger: true,
    });
    if (!ok) return;
    setBusy(t.id);
    setError(null);
    try {
      await deleteDocumentType(t.id);
      onChanged();
    } catch (e: unknown) {
      setError(
        e instanceof Error && e.message ? e.message : "Couldn't delete the type.",
      );
    } finally {
      setBusy(null);
    }
  };

  const inputClass =
    "h-9 rounded-lg border border-brand-100 bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15";

  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      <h2 className="text-[15px] font-semibold text-brand-900">
        Document types
      </h2>
      <p className="mt-1 text-[13.5px] text-ink-muted">
        Categories you can assign when uploading. Each workspace keeps its own
        list.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800">
          {error}
        </div>
      )}

      <ul className="mt-4 divide-y divide-brand-100 rounded-xl border border-brand-100">
        {types.length === 0 && (
          <li className="px-4 py-4 text-[13.5px] text-ink-muted">
            No types yet.
          </li>
        )}
        {types.map((t) => {
          const isEditing = editing?.id === t.id;
          return (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              {isEditing ? (
                <>
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={`${inputClass} w-44`}
                    aria-label="Type name"
                  />
                  <input
                    value={editing.description}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    placeholder="Description (optional)"
                    className={`${inputClass} flex-1`}
                    aria-label="Type description"
                  />
                  <button
                    onClick={save}
                    disabled={busy === t.id}
                    className="rounded-lg bg-brand-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                  >
                    {busy === t.id ? <IconSpinner size={14} /> : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50"
                    aria-label="Cancel"
                  >
                    <IconX size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-ink">
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="text-[12px] text-ink-muted">
                        {t.description}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <>
                      <button
                        onClick={() =>
                          setEditing({
                            id: t.id,
                            name: t.name,
                            description: t.description || "",
                          })
                        }
                        className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-900"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => remove(t)}
                        disabled={busy === t.id}
                        className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        aria-label={`Delete ${t.name}`}
                      >
                        {busy === t.id ? (
                          <IconSpinner size={14} />
                        ) : (
                          <IconTrash size={15} />
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New type, e.g. Contract"
            className={`${inputClass} w-48`}
            aria-label="New type name"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={`${inputClass} min-w-[200px] flex-1`}
            aria-label="New type description"
          />
          <button
            type="submit"
            disabled={!name.trim() || busy === "new"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {busy === "new" ? (
              <IconSpinner size={14} />
            ) : (
              <IconPlus size={14} />
            )}
            Add type
          </button>
        </form>
      )}
    </section>
  );
}

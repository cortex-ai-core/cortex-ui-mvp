"use client";

import { useState } from "react";

export default function RAGPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  async function runSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setSelected(null);

    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (data?.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("RAG Search Failed:", err);
      setResults([]);
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white border-l border-neutral-800 p-4 w-[380px]">
      {/* Header */}
      <h2 className="text-xl font-bold mb-4 tracking-wide">RAG Search</h2>

      {/* Search Bar */}
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search documents…"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-l px-3 py-2 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={runSearch}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 rounded-r text-sm font-semibold"
        >
          Go
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-neutral-400 text-sm mb-2">Searching…</div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto border border-neutral-800 rounded p-2">
        {results.length === 0 && !loading && (
          <div className="text-neutral-500 text-sm">
            No results yet. Try a search.
          </div>
        )}

        {results.map((r, index) => (
          <div
            key={index}
            onClick={() => setSelected(r)}
            className={`p-2 rounded cursor-pointer text-sm mb-1 ${
              selected?.chunk === r.chunk
                ? "bg-indigo-700"
                : "bg-neutral-900 hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-indigo-300">
              Document: {r.documentId}
            </div>
            <div className="text-neutral-300 truncate">{r.chunk}</div>
            <div className="text-neutral-500 text-xs">Score: {r.score}</div>
          </div>
        ))}
      </div>

      {/* Preview Panel */}
      {selected && (
        <div className="mt-4 p-3 bg-neutral-900 border border-neutral-800 rounded max-h-40 overflow-y-auto">
          <h3 className="font-bold text-indigo-300 mb-1 text-sm">Preview</h3>
          <p className="text-neutral-200 text-sm whitespace-pre-line">
            {selected.chunk}
          </p>
        </div>
      )}
    </div>
  );
}


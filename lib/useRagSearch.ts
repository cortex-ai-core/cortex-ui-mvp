// lib/useRagSearch.ts
// ============================================================
//  CORTÉX — FRONTEND RAG SEARCH HOOK (STEP 40G)
//  Allows the UI to perform semantic retrieval.
// ============================================================

import { useState } from "react";

export interface RagResult {
  id: string;
  text: string;
  metadata: any;
  similarity: number;
}

export function useRagSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RagResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Perform semantic search against backend RAG engine
  // ------------------------------------------------------------
  async function ragSearch(
    query: string,
    topK: number = 5,
    metadataFilter: any = {}
  ) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8080/api/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK, metadataFilter }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "RAG search failed.");
      }

      setResults(data.results || []);
      return data.results || [];

    } catch (err: any) {
      setError(err.message);
      return [];

    } finally {
      setLoading(false);
    }
  }

  return {
    ragSearch,
    loading,
    results,
    error,
  };
}


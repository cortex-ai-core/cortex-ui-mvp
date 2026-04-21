// cortex-ui-next/lib/ragSearch.ts
// UI-side RAG Search client — clean, single definition.

// Calls the Next.js proxy route: /api/rag
// Next.js → Fastify backend → /api/rag (server)

export async function ragSearch(query: string) {
  try {
    const response = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error("RAG search failed:", await response.text());
      return { results: [], debug: {} };
    }

    return await response.json();
  } catch (err) {
    console.error("RAG search error:", err);
    return { results: [], debug: {} };
  }
}


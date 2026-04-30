 // cortex-ui-next/lib/ragSearch.ts
 // UI-side RAG Search client — clean, single definition.

 // Calls Railway backend directly

export async function ragSearch(query: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rag`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }
    );

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

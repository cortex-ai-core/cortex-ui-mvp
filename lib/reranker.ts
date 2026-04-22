// lib/reranker.ts
//
// Phase 4 — Cortéx LLM Re-Ranker
// -----------------------------------------------
// Input:
//   - query: string
//   - retrieved: RetrievedChunk[]  (from unified retriever)
// Output:
//   - final ranked list of chunks, filtered + re-ordered by LLM
//
// This layer is the "judgement brain" of Cortéx.
// It selects the BEST chunks based on true semantic meaning.

import OpenAI from "openai";

// ✅ FIXED — define locally instead of importing
type RetrievedChunk = {
  id?: string;
  text: string;
  similarity?: number;
  lexicalScore?: number;
  metadata?: any;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function rerankChunks(
  query: string,
  retrieved: RetrievedChunk[],
  topK = 5
): Promise<RetrievedChunk[]> {
  try {
    if (!retrieved.length) return [];

    // 1️⃣ Prepare passage list for the LLM
    const passages = retrieved
      .map(
        (c, i) => `
[${i + 1}]
CHUNK ID: ${c.id}
SIMILARITY: ${(c.similarity ?? 0).toFixed(3)}
LEXICAL: ${(c.lexicalScore ?? 0).toFixed(3)}
TEXT:
${c.text}
`
      )
      .join("\n\n");

    // 2️⃣ Send to LLM for re-ranking
    const prompt = `
You are Cortéx, an elite semantic ranking engine.
Your job: evaluate which chunks best answer the user's query.

Query:
"${query}"

Here are the retrieved chunks:

${passages}

Instructions:
1. Rank chunks from MOST relevant to LEAST relevant.
2. Relevance must be based on meaning — not keyword count.
3. Remove chunks that are irrelevant or redundant.
4. Return JSON ONLY in this exact format:

{
  "ranked_ids": ["id1", "id2", "id3"],
  "reasoning": "short explanation"
}

Begin now.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
    });

    const result = JSON.parse(completion.choices[0].message.content);

    const rankedIds: string[] = result.ranked_ids;

    // 3️⃣ Reorder according to LLM ranking
    const reordered = rankedIds
      .map((id) => retrieved.find((c) => c.id === id))
      .filter(Boolean) as RetrievedChunk[];

    // 4️⃣ Apply final top-K filter
    return reordered.slice(0, topK);
  } catch (err: any) {
    console.error("LLM Re-Ranker error:", err);
    return retrieved.slice(0, topK);
  }
}

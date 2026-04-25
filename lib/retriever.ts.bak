// lib/retriever.ts
//
// Cortéx Unified Retriever (Phase 3C)
//
// This module:
//   1. Computes embeddings for the query
//   2. Calls Supabase RPC for vector search
//   3. Computes lexical keyword score locally
//   4. (Fallback) Returns results ranked by similarity + lexical score
//   5. Returns top-K chunks for RAG

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ------------------------
// Lexical Score (simple keyword overlap)
// ------------------------
function computeLexicalScore(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean);
  const tWords = text.toLowerCase().split(/\W+/).filter(Boolean);

  if (qWords.length === 0 || tWords.length === 0) return 0;

  const tSet = new Set(tWords);
  let matches = 0;

  for (const w of qWords) {
    if (tSet.has(w)) matches++;
  }

  return matches / qWords.length; // 0–1 score
}

// ------------------------
// Main Retriever
// ------------------------
export async function retrieveChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  try {
    // 1️⃣ Embed query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2️⃣ Call Supabase RPC for vector search
    const { data, error } = await supabase.rpc("cortex_vec_search", {
      query_embedding: queryEmbedding,
      match_threshold: 0.35,
      match_count: 20,
    });

    if (error) {
      console.error("Supabase vector search error:", error);
      return [];
    }

    // 3️⃣ Normalize result format
    const vectorResults: RetrievedChunk[] = (data || []).map((row: any) => ({
      id: row.id,
      text: row.text || "",
      similarity: row.similarity || 0,
      lexicalScore: computeLexicalScore(query, row.text || ""),
      metadata: row.metadata || {},
    }));

    // 4️⃣ Fallback ranking (no fusion dependency)
    const ranked = vectorResults.sort((a, b) => {
      const scoreA = (a.similarity || 0) + (a.lexicalScore || 0);
      const scoreB = (b.similarity || 0) + (b.lexicalScore || 0);
      return scoreB - scoreA;
    });

    // 5️⃣ Return top-K
    return ranked.slice(0, topK);
  } catch (err: any) {
    console.error("Retriever error:", err.message);
    return [];
  }
}

// lib/retriever.ts
//
// Cortéx Unified Retriever (Phase 3C)

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ------------------------
// Types
// ------------------------
type RetrievedChunk = {
  id?: string;
  text: string;
  similarity?: number;
  lexicalScore?: number;
  metadata?: any;
};

// ------------------------
// ✅ Lazy OpenAI client (runtime only)
// ------------------------
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({ apiKey });
}

// ------------------------
// ✅ Lazy Supabase client (runtime only)
// ------------------------
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}

// ------------------------
// Lexical Score
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

  return matches / qWords.length;
}

// ------------------------
// Main Retriever
// ------------------------
export async function retrieveChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  try {
    // ✅ Initialize at runtime ONLY
    const openai = getOpenAI();
    const supabase = getSupabase();

    // 1️⃣ Embed query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2️⃣ Vector search
    const { data, error } = await supabase.rpc("cortex_vec_search", {
      query_embedding: queryEmbedding,
      match_threshold: 0.35,
      match_count: 20,
    });

    if (error) {
      console.error("Supabase vector search error:", error);
      return [];
    }

    // 3️⃣ Normalize results
    const vectorResults: RetrievedChunk[] = (data || []).map((row: any) => ({
      id: row.id,
      text: row.text || "",
      similarity: row.similarity || 0,
      lexicalScore: computeLexicalScore(query, row.text || ""),
      metadata: row.metadata || {},
    }));

    // 4️⃣ Rank results
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

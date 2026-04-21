// =============================================================
//  CORTÉX — RETRIEVAL ENGINE v4 (Step 47 Final)
//  Adds domainSignal extraction for inference + synthesis.
//  Output shape remains backward compatible.
// =============================================================

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL missing");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================
//  retrieveKnowledge (Final Standard + Step 47 Domain Signals)
// =============================================================
export async function retrieveKnowledge(
  query: string,
  namespace: string,
  limit: number = 8
): Promise<{
  matches: { text: string; score: number; metadata: any; domainSignals?: any[] }[];
}> {
  try {
    if (!query || query.trim().length < 2) return { matches: [] };

    if (!namespace) {
      console.warn("⚠ retrieveKnowledge called with NO namespace.");
      return { matches: [] };
    }

    // =============================================================
    // 1️⃣ Generate embedding vector for query
    // =============================================================
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const embeddingVector = embedRes?.data?.[0]?.embedding;
    if (!embeddingVector) return { matches: [] };

    // =============================================================
    // 2️⃣ Supabase RAG RPC
    // =============================================================
    const { data, error } = await supabase.rpc("match_chunks", {
      query_embedding: embeddingVector,
      match_count: limit,
      filter_namespace: namespace,
    });

    if (error) {
      console.error("❌ RAG RPC ERROR:", error);
      return { matches: [] };
    }

    if (!data || data.length === 0) return { matches: [] };

    // =============================================================
    // 3️⃣ Convert → Reasoning Engine Format
    //    (Adds domainSignals derived from chunk text)
// =============================================================
    const matches = data.map((row: any) => {
      const text = row.chunk_text?.trim() || "";

      return {
        text,
        score: row.similarity || 0,
        metadata: {
          document_id: row.document_id,
          chunk_index: row.chunk_index,
          namespace: row.namespace,
        },
        domainSignals: detectDomainSignals(text), // ← NEW
      };
    });

    return { matches };
  } catch (err) {
    console.error("❌ retrieveKnowledge FAILED:", err);
    return { matches: [] };
  }
}

// =============================================================
// Step 47 — Domain Signal Extractor
// =============================================================
function detectDomainSignals(text: string) {
  if (!text) return [];

  const domainKeywords: Record<string, string[]> = {
    cybersecurity: ["zero trust", "encryption", "firewall", "incident", "malware", "SOC 2"],
    advisory: ["framework", "strategy", "evaluation", "leadership", "consulting"],
    datamanagement: ["database", "schema", "RAG", "vector", "pipeline", "supabase"],
    recruiting: ["candidate", "talent", "interview", "resume", "placement"],
    healthcare: ["clinical", "patient", "diagnosis", "care coordination"],
    finance: ["revenue", "cost", "forecast", "treasury", "valuation"],
    rfp: ["proposal", "scope", "requirements", "evaluation criteria"],
  };

  const lower = text.toLowerCase();
  const signals = [];

  for (const domain in domainKeywords) {
    const matches = domainKeywords[domain].filter((kw) => lower.includes(kw));
    if (matches.length > 0) {
      signals.push({
        domain,
        matchedKeywords: matches,
      });
    }
  }

  return signals;
}

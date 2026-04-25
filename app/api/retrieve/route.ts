import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 🔥 prevent build-time execution

// ✅ Lazy Supabase client (runtime only)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

  return createClient(url, key);
}

// ✅ Lazy OpenAI client (runtime only)
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  try {
    // ✅ Initialize at runtime ONLY
    const supabase = getSupabase();
    const openai = getOpenAI();

    const { query, namespace, topK = 5 } = await req.json();

    if (!query || !namespace) {
      return NextResponse.json(
        { error: "query and namespace are required" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 🧠 STEP 1 — Generate embedding for the query (OpenAI)
    // ------------------------------------------------------------
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    if (!queryEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate embedding" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // 🧠 STEP 2 — Call Supabase RPC for pgvector similarity search
    // ------------------------------------------------------------
    const { data, error } = await supabase.rpc("match_documents_v2", {
      query_embedding: queryEmbedding,
      namespace_name: namespace,
      match_count: topK,
    });

    if (error) {
      console.error("RAG RPC Error:", error);
      return NextResponse.json(
        { error: "RAG retrieval failed", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: data || [],
    });
  } catch (err: any) {
    console.error("Retrieve Route Error:", err);
    return NextResponse.json(
      {
        error: "Retrieve route failure",
        detail: err.message,
      },
      { status: 500 }
    );
  }
}

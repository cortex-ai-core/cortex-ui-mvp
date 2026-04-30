import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 🔥 CRITICAL

// ✅ Lazy OpenAI client (runtime only)
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({ apiKey });
}

// ✅ Lazy Supabase client (runtime only)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    // ✅ Initialize at runtime ONLY
    const openai = getOpenAI();
    const supabase = getSupabase();

    const { query, topK = 5 } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing query text" },
        { status: 400 }
      );
    }

    // 1️⃣ Generate embedding for the user query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2️⃣ Vector search against your embeddings table
    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_count: topK,
    });

    if (error) {
      return NextResponse.json(
        { error: "Vector search failed", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        query,
        matches: data, // id, file_id, text, similarity score
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("RAG Query Error:", err);
    return NextResponse.json(
      { error: "RAG Query Failure", details: err?.message },
      { status: 500 }
    );
  }
}

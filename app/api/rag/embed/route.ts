import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

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

// Simple chunker for safety
function chunkText(text: string, size = 800): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    // ✅ Initialize at runtime ONLY
    const openai = getOpenAI();
    const supabase = getSupabase();

    const { text, file_id } = await req.json();

    if (!text || !file_id) {
      return NextResponse.json(
        { error: "Missing text or file_id" },
        { status: 400 }
      );
    }

    // 1️⃣ Chunk text
    const chunks = chunkText(text);

    // 2️⃣ Embed each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        return {
          content: chunk,
          embedding: response.data[0].embedding,
        };
      })
    );

    // 3️⃣ Insert into Supabase
    const { error } = await supabase.from("embeddings").insert(
      embeddings.map((e) => ({
        file_id,
        content: e.content,
        embedding: e.embedding,
      }))
    );

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert embeddings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        file_id,
        chunksInserted: embeddings.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Embedding error:", err);
    return NextResponse.json(
      { error: err?.message || "Embedding failure" },
      { status: 500 }
    );
  }
}

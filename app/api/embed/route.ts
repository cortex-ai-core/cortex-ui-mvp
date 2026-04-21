import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { text, chunk_id } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    // 1️⃣ Chunk text
    const chunks = chunkText(text);

    // 2️⃣ Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        return {
          text: chunk,
          embedding: response.data[0].embedding,
          chunk_id: chunk_id ?? null
        };
      })
    );

    // 3️⃣ Insert into Supabase (correct column names only)
    const { error } = await supabase.from("embeddings").insert(
      embeddings.map((e) => ({
        chunk_id: e.chunk_id,
        text: e.text,
        embedding: e.embedding
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


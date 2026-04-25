import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 🔥 CRITICAL: prevents build-time execution

// ✅ Lazy Supabase client (runtime only)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}

// --- Chunking configuration ---
const CHUNK_SIZE = 800;     // characters
const CHUNK_OVERLAP = 200;  // characters

function createChunks(text: string): { id: string; content: string }[] {
  const chunks = [];
  let index = 0;

  while (index < text.length) {
    const end = Math.min(index + CHUNK_SIZE, text.length);
    const chunkText = text.slice(index, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        id: uuidv4(),
        content: chunkText
      });
    }

    index += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function POST(req: Request) {
  try {
    // ✅ Initialize Supabase at runtime ONLY
    const supabase = getSupabase();

    const { document_id, text } = await req.json();

    if (!document_id || !text) {
      return NextResponse.json(
        { error: "Missing document_id or text" },
        { status: 400 }
      );
    }

    // Clean text
    const cleaned = text.replace(/\s+/g, " ").trim();
    const chunks = createChunks(cleaned);

    // Insert chunks into Supabase
    const { error } = await supabase.from("document_chunks").insert(
      chunks.map((c) => ({
        id: c.id,
        document_id,
        chunk_text: c.content
      }))
    );

    if (error) {
      console.error("Chunk insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert chunks", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document_id,
        total_chunks: chunks.length,
        chunks: chunks.map((c) => ({
          chunk_id: c.id,
          preview: c.content.slice(0, 50)
        }))
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Chunk API error:", err);
    return NextResponse.json(
      { error: "Chunk generation failure", details: err?.message },
      { status: 500 }
    );
  }
}

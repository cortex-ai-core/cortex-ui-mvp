import { NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/retriever";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 🔥 prevent build-time execution

export async function GET() {
  try {
    // ✅ Safe guard: ensure env is present at runtime
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const results = await retrieveChunks("test query for Cortéx");

    return NextResponse.json(
      {
        success: true,
        results,
        count: results.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Test Retriever API error:", err);

    return NextResponse.json(
      { error: err?.message || "Retriever failed" },
      { status: 500 }
    );
  }
}

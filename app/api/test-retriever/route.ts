import { NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/retriever";

// ✅ FORCE dynamic execution (prevents build-time execution)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await retrieveChunks("test query for Cortéx");

    return NextResponse.json(
      {
        success: true,
        results: results,
        count: results.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Retriever failed" },
      { status: 500 }
    );
  }
}

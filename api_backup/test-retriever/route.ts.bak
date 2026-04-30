import { NextResponse } from "next/server";
import { retrieveDocuments } from "@/lib/retriever";

export async function GET() {
  try {
    const result = await retrieveDocuments("test query for Cortéx");

    return NextResponse.json(
      {
        success: true,
        results: result.results,
        count: result.results.length
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


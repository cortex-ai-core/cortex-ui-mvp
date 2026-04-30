// /app/api/rag-search/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // ------------------------------------------------------------
    // Validate query input
    // ------------------------------------------------------------
    if (!query || query.trim() === "") {
      return NextResponse.json(
        { results: [], debug: { error: "Missing query text" } },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Proxy → Fastify RAG endpoint
    // ------------------------------------------------------------
    const response = await fetch(`${process.env.CORTEX_SERVER_URL}/api/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    // Read raw response text
    const text = await response.text();

    // ------------------------------------------------------------
    // Always return CLEAN JSON (never HTML or undefined)
    // ------------------------------------------------------------
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ /rag-search backend non-JSON:", text);
      return NextResponse.json(
        { results: [], debug: { error: "Non-JSON backend response", raw: text } },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // Pass-through including backend HTTP status
    // ------------------------------------------------------------
    return NextResponse.json(data, { status: response.status });

  } catch (err: any) {
    console.error("API /rag-search error:", err);
    return NextResponse.json(
      { results: [], debug: { error: err?.message || "Unknown error" } },
      { status: 500 }
    );
  }
}


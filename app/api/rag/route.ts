import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { results: [], debug: { error: "Missing query text" } },
        { status: 400 }
      );
    }

    // UI → Next.js Proxy → Fastify Backend
    const response = await fetch(`${process.env.CORTEX_SERVER_URL}/api/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    // If backend fails → always return clean JSON (never HTML)
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { results: [], debug: { error: "Non-JSON response", raw: text } },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });

  } catch (err: any) {
    console.error("API /rag/search error:", err);
    return NextResponse.json(
      { results: [], debug: { error: err?.message || "Unknown error" } },
      { status: 500 }
    );
  }
}


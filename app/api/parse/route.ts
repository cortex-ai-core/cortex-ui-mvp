import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import mammoth from "mammoth";

export const runtime = "nodejs";

// Supabase SERVICE ROLE client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Clean parsed text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/\r/g, "")
    .trim();
}

// PATCHED: Robust MIME → extension normalization
function resolveType(type: string, originalName: string): "pdf" | "docx" | "txt" | null {
  if (!type) type = "";

  const lower = type.toLowerCase();

  // Strong MIME checks
  if (lower.includes("pdf")) return "pdf";
  if (lower.includes("wordprocessingml") || lower.includes("msword")) return "docx";
  if (lower.includes("text")) return "txt";

  // EXTENSION FALLBACK (PATCH)
  const ext = originalName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "txt") return "txt";

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path, type, originalName, namespace } = body;

    console.log("🔍 [PARSE] Incoming:", body);

    if (!namespace) {
      return NextResponse.json({ error: "Namespace is required." }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: "Missing file path." }, { status: 400 });
    }

    // PATCHED TYPE RESOLUTION
    const normalizedType = resolveType(type, originalName || path);
    console.log("🔍 [PARSE] Resolved file type →", normalizedType);

    if (!normalizedType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${type}`, file: originalName },
        { status: 400 }
      );
    }

    // Download from correct bucket
    const { data, error } = await supabase.storage
      .from("uploaded-files")
      .download(path);

    if (error || !data) {
      console.error("❌ [PARSE] Download error:", error);
      return NextResponse.json(
        { error: "Unable to download file", details: error?.message },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    let rawText = "";

    // PATCH: PARSE ROUTER
    if (normalizedType === "pdf") {
      const pdfParser = new PDFParser();
      rawText = await new Promise<string>((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (err: any) =>
          reject(err?.parserError ?? err) // ✅ FIXED
        );
        pdfParser.on("pdfParser_dataReady", () =>
          resolve(pdfParser.getRawTextContent())
        );
        pdfParser.parseBuffer(buffer);
      });
    } else if (normalizedType === "docx") {
      const parsed = await mammoth.extractRawText({ buffer });
      rawText = parsed.value;
    } else if (normalizedType === "txt") {
      rawText = buffer.toString("utf8");
    }

    const cleaned = cleanText(rawText);

    if (!cleaned.length) {
      return NextResponse.json(
        { error: "Parsed text is empty — scanned or image-based file." },
        { status: 400 }
      );
    }

    // Call backend ingestion
    const ingestRes = await fetch(`${process.env.CORTEX_SERVER_URL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleaned,
        file_name: originalName || path,
        namespace,
      }),
    });

    if (!ingestRes.ok) {
      const errText = await ingestRes.text();
      console.error("❌ [INGEST] Failed ingestion:", errText);
      return NextResponse.json(
        { error: "Failed to ingest document", details: errText },
        { status: 500 }
      );
    }

    const ingestData = await ingestRes.json();

    return NextResponse.json(
      {
        success: true,
        document_id: ingestData.documentId,
        chunks_created: ingestData.chunks,
        namespace,
        preview: cleaned.slice(0, 500),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ [PARSE] Unexpected error:", err);
    return NextResponse.json(
      { error: "Parse failure", details: err?.message },
      { status: 500 }
    );
  }
}

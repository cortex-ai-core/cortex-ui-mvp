import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  console.log("🔍 [UPLOAD] Incoming request:", {
    method: req.method,
    url: req.url,
  });

  // Must initialize the response BEFORE creating Supabase client
  const res = NextResponse.next();

  console.log("🔍 [COOKIES] Incoming request cookies:");
  req.cookies.getAll().forEach((c) =>
    console.log(`   • ${c.name}: ${c.value}`)
  );

  // Create Supabase client with proper cookie binding
  const supabase = createRouteClient(req, res);

  console.log("🔍 [AUTH] Attempting supabase.auth.getUser()…");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("🔍 [AUTH RESULT]", {
    user,
    userError,
  });

  if (userError || !user) {
    console.warn("❌ AUTH ERROR — No session found!", userError);
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized — no Supabase session found.",
        detail: userError?.message,
      },
      { status: 401 }
    );
  }

  console.log("✅ Authenticated user:", {
    id: user.id,
    email: user.email,
  });

  // Parse incoming form data
  console.log("🔍 [UPLOAD] Reading formData()…");
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    console.warn("❌ [UPLOAD] No file found in formData().");
    return NextResponse.json(
      { success: false, error: "No file provided in formData." },
      { status: 400 }
    );
  }

  console.log("📄 [FILE] File received:", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Build file path
  const fileExt = file.name.split(".").pop();
  const filePath = `${user.id}/${randomUUID()}.${fileExt}`;

  console.log("📦 [STORAGE] Uploading to Supabase Storage:", {
    bucket: "uploaded-files",
    path: filePath,
  });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("uploaded-files")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
    });

  console.log("📦 [STORAGE RESULT]", {
    uploadData,
    uploadError,
  });

  if (uploadError) {
    console.error("❌ STORAGE UPLOAD ERROR:", uploadError);
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed.",
        detail: uploadError.message,
      },
      { status: 500 }
    );
  }

  // Insert metadata into documents table
  console.log("📝 [DATABASE] Inserting log into docs table…");

  const { error: logError } = await supabase.from("documents").insert({
    user_id: user.id,
    file_name: file.name,
    storage_path: filePath,
    created_at: new Date().toISOString(),
  });

  console.log("📝 [DATABASE RESULT]", {
    logError,
  });

  if (logError) {
    console.warn("⚠️ DATABASE LOGGING ERROR:", logError);
    // We still return success because upload/document save succeeded
  }

  console.log("✅ Upload success. Returning response.");

  // FINAL RETURN — NOW MATCHES FRONTEND EXPECTATIONS
  return NextResponse.json(
    {
      success: true,
      uploaded: true,
      path: filePath,
      user: {
        id: user.id,
        email: user.email,
      },
    },
    { status: 200 }
  );
}

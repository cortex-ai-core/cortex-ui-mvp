import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST(req: Request) {
  const supabase = createClient();

  // Authenticate user
  const authUser = await requireAuth();
  const userId = authUser.id;
  const namespace = authUser.user_metadata?.namespace;

  if (!namespace) {
    return NextResponse.json(
      { success: false, error: "Namespace missing for user. Cannot upload." },
      { status: 400 }
    );
  }

  try {
    const { name, type, content } = await req.json();

    // Insert document row WITH namespace enforced
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        name,
        type,
        namespace,       // <-- The enforcement
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (err: any) {
    console.error("Upload exception:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload document." },
      { status: 500 }
    );
  }
}


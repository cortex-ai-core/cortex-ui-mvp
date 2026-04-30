import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server"; // ✅ FIXED
import { hasPermission } from "@/lib/auth/hasPermission";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient(); // ✅ FIXED (await added)

    // ------------------------------------------------------------
    // AUTH: Get user session
    // ------------------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // RBAC: Check user role
    // ------------------------------------------------------------
    const userRole = user.user_metadata?.role;

    if (!hasPermission(userRole, "delete_documents")) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to delete documents." },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // INPUT VALIDATION
    // ------------------------------------------------------------
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // FETCH DOCUMENT FOR AUDIT METADATA
    // ------------------------------------------------------------
    const { data: docRecord, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (docError) {
      console.error("Document lookup error:", docError);
    }

    // ------------------------------------------------------------
    // DELETE FROM SUPABASE
    // ------------------------------------------------------------
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("❌ Document delete error:", deleteError);
      return NextResponse.json(
        { error: "Document delete failed." },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // AUDIT LOG ENTRY
    // ------------------------------------------------------------
    const auditPayload = {
      user_id: user.id,
      role: userRole,
      action: "delete_document",
      document_id: id,
      namespace: docRecord?.namespace || null,
      details: {
        name: docRecord?.name || null,
        type: docRecord?.type || null,
        deleted_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditPayload);

    if (auditError) {
      console.error("Audit log insert error:", auditError);
      // Do NOT block success — system must continue
    }

    // ------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------
    return NextResponse.json(
      { success: true, message: "Document deleted successfully." },
      { status: 200 }
    );

  } catch (err) {
    console.error("🔥 Delete route fatal error:", err);
    return NextResponse.json(
      { error: "Server failure deleting document." },
      { status: 500 }
    );
  }
}

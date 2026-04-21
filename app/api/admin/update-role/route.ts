import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server"; // ✅ FIXED
import { hasPermission } from "@/lib/auth/hasPermission";

export async function POST(request: Request) {
  try {
    const supabase = createServerClient(); // ✅ FIXED

    // ------------------------------------------------------------
    // AUTH: Verify caller (Super Admin)
    // ------------------------------------------------------------
    const {
      data: { user: actingUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !actingUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const actingRole = actingUser.user_metadata?.role;
    if (!hasPermission(actingRole, "manage_users")) {
      return NextResponse.json(
        { error: "Forbidden. Insufficient permission." },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // INPUT VALIDATION
    // ------------------------------------------------------------
    const { target_user_id, new_role, previous_role } = await request.json();

    if (!target_user_id || !new_role || !previous_role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // UPDATE USER ROLE
    // ------------------------------------------------------------
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      target_user_id,
      {
        user_metadata: { role: new_role },
      }
    );

    if (updateError) {
      console.error("Role update error:", updateError);
      return NextResponse.json(
        { error: "Role update failed." },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // AUDIT LOG ENTRY
    // ------------------------------------------------------------
    const { error: auditError } = await supabase.from("audit_logs").insert({
      event_type: "role_changed",
      user_id: actingUser.id,
      target_user_id: target_user_id,
      timestamp: new Date().toISOString(),
      metadata: {
        previous_role,
        new_role,
        changed_by: actingUser.email,
      },
    });

    if (auditError) {
      console.error("Audit log error:", auditError);
    }

    return NextResponse.json(
      { success: true, message: "Role updated and logged." },
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 update-role fatal error:", err);
    return NextResponse.json(
      { error: "Server error updating role." },
      { status: 500 }
    );
  }
}

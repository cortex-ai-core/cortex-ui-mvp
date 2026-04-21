import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

const DEFAULT_ROLE = "viewer";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  // 1. Login attempt
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    return NextResponse.json(
      { error: "Invalid login credentials." },
      { status: 401 }
    );
  }

  const userId = authData.user.id;

  // 2. Check if user exists in public.users
  const { data: existingUser, error: selectErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (selectErr && selectErr.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Failed to verify user record." },
      { status: 500 }
    );
  }

  // 3. If not found → create with defaults
  if (!existingUser) {
    const { error: insertErr } = await supabase.from("users").insert([
      {
        id: userId,
        email,
        role: DEFAULT_ROLE,
        tenant_id: userId, // temporary until Step 41C tenant mapping
      },
    ]);

    if (insertErr) {
      return NextResponse.json(
        { error: "Failed to create user profile." },
        { status: 500 }
      );
    }
  }

  // 4. Inject correct metadata into JWT (role + tenant)
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      role: existingUser?.role ?? DEFAULT_ROLE,
      tenant_id: existingUser?.tenant_id ?? userId,
    },
  });

  // 5. Return session + user metadata
  return NextResponse.json(
    {
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email ?? "",
        role: existingUser?.role ?? DEFAULT_ROLE,
      },
    },
    { status: 200 }
  );
}


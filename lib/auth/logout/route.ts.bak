import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // 1. Sign out from Supabase Auth (server-side)
  await supabase.auth.signOut();

  // 2. Overwrite the secure HTTP-only cookie with an expired token
  cookies().set("sb-access-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0), // expired timestamp
  });

  return NextResponse.json(
    { message: "Logout successful." },
    { status: 200 }
  );
}


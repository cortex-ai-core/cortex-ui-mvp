"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";

/**
 * Ensures the user is authenticated before accessing a page.
 * If not logged in, redirect to /login.
 * Returns the Supabase user for downstream RBAC.
 */
export async function requireAuth() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({ cookies: cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  return session.user;
}


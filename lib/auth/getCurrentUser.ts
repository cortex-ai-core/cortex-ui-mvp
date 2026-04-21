"use server";

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";

/**
 * Returns the authenticated user with role + tenant metadata.
 * Fast path: JWT claims
 * Slow path: DB lookup fallback
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({ cookies: cookieStore });

  // 1. Fetch current session from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return null; // not logged in
  }

  const { user } = session;

  // 2. Fast path: Extract role + tenant from JWT metadata
  const role = (user.user_metadata?.role as string) || null;
  const tenantId = (user.user_metadata?.tenant_id as string) || null;

  // If both values exist, return immediately
  if (role && tenantId) {
    return {
      id: user.id,
      email: user.email ?? "",
      role,
      tenant_id: tenantId,
    };
  }

  // 3. Slow path fallback: Fetch authoritative values from DB
  const { data: profile, error } = await supabase
    .from("users")
    .select("email, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("User fallback fetch failed:", error);
    return {
      id: user.id,
      email: user.email ?? "",
      role: "viewer", // safe fallback
      tenant_id: user.id, // placeholder until tenant isolation
    };
  }

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    role: profile.role,
    tenant_id: profile.tenant_id,
  };
}


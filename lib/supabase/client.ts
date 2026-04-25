"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ✅ Runtime validation (prevents build crashes + silent failures)
  if (!url || !key) {
    throw new Error("Missing Supabase client environment variables");
  }

  return createBrowserClient(url, key);
}

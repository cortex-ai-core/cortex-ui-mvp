import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function createMiddlewareSupabaseClient(
  req: NextRequest,
  res: NextResponse
) {
  let supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return supabase;
}

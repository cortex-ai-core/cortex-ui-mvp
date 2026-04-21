import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middlewareClient";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // 🔥 EXCLUDE BACKEND NAMESPACE — DO NOT RUN SSR MIDDLEWARE
  if (url.startsWith("/backend")) {
    return NextResponse.next(); // Skip Supabase middleware entirely
  }

  const res = NextResponse.next();

  const supabase = createMiddlewareSupabaseClient(req, res);

  // Load + refresh Supabase session tokens
  await supabase.auth.getSession();

  return res;
}

// ============================================================
// NEW MATCHER — EXCLUDES /backend/* FROM MIDDLEWARE
// ============================================================
export const config = {
  matcher: [
    // Run middleware on everything EXCEPT:
    // - backend routes (Fastify)
    // - static files
    // - _next files
    "/((?!backend|_next/static|_next/image|favicon.ico).*)"
  ],
  runtime: "nodejs",
};

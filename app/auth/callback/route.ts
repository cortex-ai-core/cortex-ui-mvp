import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect("http://localhost:3000/");

  const supabase = createRouteClient(req, res);

  // This handles all token exchange logic (access + refresh + cookies)
  await supabase.auth.exchangeCodeForSession(req.url);

  return res;
}

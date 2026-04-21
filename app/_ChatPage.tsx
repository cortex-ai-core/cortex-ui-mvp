// app/_ChatPage.tsx — SERVER COMPONENT

import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import Page from "./page";

export default async function ChatPageServerWrapper() {
  const supabase = createServerClient(); // ✅ FIXED

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Page user={user} />;
}

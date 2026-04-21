// app/_ChatPage.tsx — SERVER COMPONENT

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import Page from "./page";

export default async function ChatPageServerWrapper() {
  const supabase = createServerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Page user={user} />;
}


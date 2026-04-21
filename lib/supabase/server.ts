import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

export async function createServerClient() {
  const cookieStore = await cookies(); // <-- MUST be awaited in Next.js 14+

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next.js requires try/catch for mutation attempts
          try {
            cookieStore.set({ name, value, ...options });
          } catch (err) {
            console.warn("Could not set cookie:", err);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (err) {
            console.warn("Could not remove cookie:", err);
          }
        }
      },
      global: { fetch }
    }
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatClient from "./ChatClient";
import { Suspense } from "react";
import { getUserFromToken } from "@/lib/auth/getUserFromToken";

export default function ChatWrapper() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 🛡️ HARD GUARD — prevent any SSR execution issues
    if (typeof window === "undefined") return;

    let attempts = 0;

    const interval = setInterval(() => {
      const token = window.localStorage.getItem("token");

      // ⏳ wait for token to exist
      if (!token) {
        attempts++;

        // after ~2 seconds → redirect
        if (attempts > 10) {
          console.error("❌ No token after wait — redirecting");
          clearInterval(interval);
          router.replace("/login");
        }

        return;
      }

      const parsedUser = getUserFromToken();

      console.log("DECODED USER:", parsedUser);

      if (
        !parsedUser ||
        !parsedUser.userId ||
        !parsedUser.role ||
        !parsedUser.namespace
      ) {
        console.error("❌ Invalid token payload — redirecting");
        clearInterval(interval);
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
      clearInterval(interval);
    }, 150);

    return () => clearInterval(interval);
  }, [router]);

  if (!user) return null;

  return (
    <Suspense fallback={null}>
      <ChatClient user={user} />
    </Suspense>
  );
}

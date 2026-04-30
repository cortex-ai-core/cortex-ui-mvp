"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatClient from "./ChatClient";
import { Suspense } from "react";

export default function ChatWrapper() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let attempts = 0;

    const interval = setInterval(() => {
      const token = window.localStorage.getItem("token");

      if (!token) {
        attempts++;

        if (attempts > 10) {
          console.error("❌ No token — redirecting");
          clearInterval(interval);
          router.replace("/login");
        }

        return;
      }

      // 🔥 SAFE INLINE TOKEN PARSE (NO IMPORT)
      let parsedUser: any = null;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        parsedUser = payload;
      } catch (err) {
        console.error("❌ Token decode failed:", err);
      }

      if (
        !parsedUser ||
        !parsedUser.userId ||
        !parsedUser.role ||
        !parsedUser.namespace
      ) {
        console.error("❌ Invalid token — redirecting");
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

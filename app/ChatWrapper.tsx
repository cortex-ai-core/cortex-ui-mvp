"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ChatClient from "./ChatClient";
import { DialogProvider } from "@/components/Dialog";

function BrandLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/brand/sollucio-logo.png"
          alt="Sollucio Partners"
          width={155}
          height={93}
          priority
          className="h-12 w-auto opacity-80"
        />
        <div className="flex items-center gap-1.5">
          <span className="dot h-2 w-2 rounded-full bg-brand-600" />
          <span className="dot h-2 w-2 rounded-full bg-brand-600" />
          <span className="dot h-2 w-2 rounded-full bg-brand-600" />
        </div>
      </div>
    </div>
  );
}

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
          clearInterval(interval);
          router.replace("/login");
        }

        return;
      }

      let parsedUser: any = null;

      try {
        parsedUser = JSON.parse(atob(token.split(".")[1]));
      } catch (err) {
        console.error("Token decode failed:", err);
      }

      if (
        !parsedUser ||
        !parsedUser.userId ||
        !parsedUser.role ||
        !parsedUser.namespaceId
      ) {
        clearInterval(interval);
        window.localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
      clearInterval(interval);
    }, 150);

    return () => clearInterval(interval);
  }, [router]);

  if (!user) return <BrandLoader />;

  return (
    <Suspense fallback={<BrandLoader />}>
      <DialogProvider>
        <ChatClient user={user} />
      </DialogProvider>
    </Suspense>
  );
}

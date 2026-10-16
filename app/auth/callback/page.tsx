"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return <p>Continue to sign in…</p>;
}

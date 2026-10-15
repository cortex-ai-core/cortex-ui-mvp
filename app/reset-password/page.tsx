"use client";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import Link from "next/link";
import { BACKEND } from "@/lib/backend";

export default function ResetPassword() {
  const [email,setEmail]=useState("");
  const [code,setCode]=useState("");
  const [password,setPassword]=useState("");
  const [stage,setStage]=useState<"request"|"confirm"|"done">("request");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent) {
    event.preventDefault();if(pending)return;setPending(true);setError("");
    try {
      const response=await fetch(`${BACKEND}/api/auth/password-reset/${stage}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim(),...(stage==="confirm"?{code,password}:{})})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to reset your password.");
      setStage(stage==="request"?"confirm":"done");setPassword("");
    }catch(err){setError(err instanceof Error?err.message:"Unable to reach the server.");}
    finally{setPending(false);}
  }
  const field="mt-1.5 w-full h-12 rounded-xl border border-brand-100 bg-white px-4 text-[15px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";
  return <AuthShell><section className="rounded-2xl border border-brand-100 bg-white p-8 shadow-card">
    <h1 className="text-2xl font-semibold text-brand-900">Reset your password</h1>
    {stage==="done"?<p role="status" className="mt-4">Your password has been updated. Sign in with your new password.</p>:<form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-[13px] font-medium text-ink">Email<input className={field} type="email" autoComplete="username" required maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} disabled={pending||stage==="confirm"}/></label>
      {stage==="confirm"&&<><p role="status" className="text-sm text-ink-muted">If your account is eligible, a six-digit code will arrive by email.</p>
      <label className="block text-[13px] font-medium text-ink">Reset code<input className={field} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)} disabled={pending}/></label>
      <label className="block text-[13px] font-medium text-ink">New password<input className={field} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending}/></label>
      <p className="text-sm text-ink-muted">Use at least 12 characters, including uppercase, lowercase, a number and a symbol.</p></>}
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-900 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-600/25 disabled:opacity-70" disabled={pending}>{pending?"Please wait…":stage==="request"?"Send reset code":"Update password"}</button>
    </form>}
    <Link href="/login/" className="mt-6 inline-block text-brand-900 underline">Back to sign in</Link>
  </section></AuthShell>;
}

"use client";

import { BACKEND } from "@/lib/backend";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import Link from "next/link";
import { IconEye, IconEyeOff, IconSpinner } from "@/components/icons";



export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken,setChallengeToken]=useState<string|null>(null);
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    try {
      if (localStorage.getItem("token")) router.replace("/");
    } catch {
      /* storage unavailable; show the form */
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if(challengeToken&&(newPassword.length<12||newPassword!==confirmPassword)){setError("Choose a password of at least 12 characters and confirm it.");return;}
    if (!email.trim() || (!password&&!challengeToken)) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challengeToken?{challengeToken,newPassword}:{ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if(res.ok&&data?.challenge==='NEW_PASSWORD_REQUIRED'){
        setChallengeToken(data.challengeToken);setPassword('');return;
      }
      if (res.ok && data?.token) {
        localStorage.setItem("token", data.token);
        router.replace("/");
        return;
      }

      setError(
        res.status === 401
          ? "That email or password isn't right. Use your individual account credentials."
          : res.status === 403 && typeof data?.error === "string"
            ? data.error
            : "Sign-in failed. Please try again."
      );
    } catch {
      setError(
        "Can't reach the Cortéx server. Check that it's running, then try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full h-12 rounded-xl border border-brand-100 bg-white px-4 text-[15px] text-ink placeholder:text-ink-muted/60 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

  return <AuthShell>
          <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-card">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
              {challengeToken ? "Choose your new password" : "Sign in to Cortéx"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              {challengeToken ? "Use at least 12 characters, including upper and lower case letters, a number, and a symbol." : "Use the email and password for your individual account."}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[13px] font-medium text-ink"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@company.com"
                  disabled={submitting||!!challengeToken}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[13px] font-medium text-ink"
                >
                  {challengeToken ? "New password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={challengeToken ? "new-password" : "current-password"}
                    value={challengeToken?newPassword:password}
                    onChange={(e) => challengeToken?setNewPassword(e.target.value):setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-muted transition hover:bg-brand-50 hover:text-brand-900"
                    tabIndex={-1}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {challengeToken&&<div><label htmlFor="confirm-password" className="mb-1.5 block text-[13px] font-medium text-ink">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={inputClass} disabled={submitting}/></div>}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-900 text-[15px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-600/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <IconSpinner />}
                {submitting ? "Signing in…" : challengeToken ? "Set password and sign in" : "Sign in"}
              </button>
            </form>
            <Link href="/reset-password/" className="mt-5 inline-block text-sm text-brand-900 underline">Forgot your password?</Link>
          </div>

  </AuthShell>;
}

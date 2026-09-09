"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconEye, IconEyeOff, IconSpinner } from "@/components/icons";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

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

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------------
          BRAND PANEL
      ------------------------------------------------------ */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-900 text-white brand-pattern">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/70 via-brand-900/85 to-brand-950/95" />

        <div className="relative z-10 p-12">
          <Image
            src="/brand/sollucio-logo.png"
            alt="Sollucio Partners"
            width={155}
            height={93}
            priority
            className="logo-invert h-16 w-auto"
          />
        </div>

        <div className="relative z-10 px-12 pb-14 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">
            Cortéx
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            Your private intelligence engine.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Ask questions across the documents your team has shared. Answers
            stay inside your workspace, grounded in your own materials.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              "Workspace-scoped: every answer is drawn only from your namespace",
              "Private mode for documents that should never be stored",
              "Executive-ready summaries, comparisons, and briefs",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------
          FORM PANEL
      ------------------------------------------------------ */}
      <section className="flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-[420px]">
          {/* Mobile-only brand header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/brand/sollucio-logo.png"
              alt="Sollucio Partners"
              width={155}
              height={93}
              priority
              className="h-12 w-auto"
            />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-card">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
              Sign in to Cortéx
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Use the email and password for your individual account.
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
                  disabled={submitting}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[13px] font-medium text-ink"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted">
            Access is limited to authorized Sollucio workspaces. Contact your
            administrator if you need credentials.
          </p>
        </div>
      </section>
    </div>
  );
}

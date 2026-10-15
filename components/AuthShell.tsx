"use client";
import Image from "next/image";
import type {ReactNode} from "react";
export default function AuthShell({children}:{children:ReactNode}){return <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
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
              "Private mode for documents that should never be kept",
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

<section className="flex items-center justify-center px-6 py-12 bg-surface"><div className="w-full max-w-[420px]"><div className="mb-8 flex items-center gap-3 lg:hidden"><Image src="/brand/sollucio-logo.png" alt="Sollucio Partners" width={155} height={93} priority className="h-12 w-auto"/></div>{children}<p className="mt-6 text-center text-xs text-ink-muted">Access is limited to authorized Sollucio workspaces. Contact your administrator if you need credentials.</p></div></section></div>;}

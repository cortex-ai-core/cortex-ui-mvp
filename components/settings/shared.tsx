import type { ReactNode } from "react";

export function SettingsDestination({
  title,
  description,
  detail,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  detail?: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-40 w-full flex-col rounded-2xl border border-brand-100 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-900">
        {icon}
      </span>
      <span className="mt-4 flex w-full items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-brand-900">
          {title}
        </span>
        <span className="text-xl leading-none text-brand-400 transition group-hover:translate-x-0.5 group-hover:text-brand-900">
          →
        </span>
      </span>
      <span className="mt-1 text-[13.5px] leading-5 text-ink-muted">
        {description}
      </span>
      {detail && (
        <span className="mt-3 text-[12px] font-medium text-brand-700">
          {detail}
        </span>
      )}
    </button>
  );
}

export function BackToSettings({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium text-brand-700 hover:text-brand-900"
    >
      <span aria-hidden="true">←</span> Settings
    </button>
  );
}

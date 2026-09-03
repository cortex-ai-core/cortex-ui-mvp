import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number, props: IconProps) {
  const { size: _s, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props.size ?? 18, props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...base(props.size ?? 18, props)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconUnlock(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.5" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M10 17l5-5-5-5M15 12H3M21 4v16" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
    </svg>
  );
}

export function IconPaperclip(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M21 11.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9-9a3.5 3.5 0 0 1 5 5l-9 9a1.5 1.5 0 0 1-2.1-2.1l8.3-8.3" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base(props.size ?? 14, props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconDoc(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props.size ?? 20, props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props.size ?? 16, props)}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props.size ?? 18, props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base(props.size ?? 18, props)}>
      <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1" />
    </svg>
  );
}

export function IconSpinner(props: IconProps) {
  const { className, ...rest } = props;
  return (
    <svg
      {...base(props.size ?? 16, rest)}
      className={`animate-spin ${className ?? ""}`}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </svg>
  );
}

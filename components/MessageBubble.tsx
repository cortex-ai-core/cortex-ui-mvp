"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Citation, citationTitle, citationWhere } from "@/lib/citations";
import { IconDoc } from "./icons";

interface MessageBubbleProps {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
  citations?: Citation[];
  onCite?: (c: Citation) => void;
}

// "[3]" in the answer becomes a markdown link to #cite-3 so it renders as a chip
// without breaking the surrounding markdown.
function linkifyCitations(text: string, known: Set<number>) {
  return text.replace(/\[(\d{1,3})\]/g, (m, n) => (known.has(Number(n)) ? `[${n}](#cite-${n})` : m));
}

export default function MessageBubble({
  role,
  content,
  sources = [],
  citations = [],
  onCite,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  const [displayContent, setDisplayContent] = useState(content);

  // Keeps rendering in step with streamed updates without thrashing React.
  const incomingRef = useRef(content);
  const renderedRef = useRef("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    incomingRef.current = content;
    if (incomingRef.current === renderedRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const update = () => {
      if (incomingRef.current !== renderedRef.current) {
        renderedRef.current = incomingRef.current;
        setDisplayContent(incomingRef.current);
      }
      if (incomingRef.current !== renderedRef.current) {
        rafRef.current = requestAnimationFrame(update);
      }
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [content, role]);

  const byN = useMemo(() => new Map(citations.map((c) => [c.n, c])), [citations]);
  const rendered = useMemo(
    () => (citations.length ? linkifyCitations(displayContent, new Set(byN.keys())) : displayContent),
    [displayContent, citations.length, byN]
  );

  // distinct documents cited, in first-citation order
  const citedDocs = useMemo(() => {
    const seen = new Map<string, Citation>();
    for (const c of citations) {
      const key = c.document_id || c.file_name || String(c.n);
      if (!seen.has(key)) seen.set(key, c);
    }
    return [...seen.values()];
  }, [citations]);

  const bubbleClass = isSystem
    ? "bg-amber-50 text-amber-900 border border-amber-200"
    : isUser
    ? "bg-brand-900 text-white shadow-[0_4px_14px_rgba(0,65,61,0.22)]"
    : "bg-white text-ink border border-brand-100 shadow-card";

  return (
    <div className={`rise-in flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && !isSystem && (
        <div
          aria-hidden
          className="msg-avatar mt-0.5 hidden shrink-0 items-center justify-center rounded-full bg-brand-900 font-bold text-white sm:flex"
        >
          C
        </div>
      )}

      <div
        className={`msg-bubble min-w-0 ${bubbleClass} ${
          isUser ? "msg-bubble-user" : "msg-bubble-assistant"
        }`}
      >
        <div className={`markdown ${isUser ? "markdown-dark" : ""}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children, ...rest }) => {
                const m = /^#cite-(\d+)$/.exec(href || "");
                if (m) {
                  const c = byN.get(Number(m[1]));
                  if (!c) return <>{children}</>;
                  return (
                    <button
                      type="button"
                      onClick={() => onCite?.(c)}
                      title={`${citationTitle(c)}${citationWhere(c) ? ` · ${citationWhere(c)}` : ""}`}
                      className="ml-0.5 inline-flex h-[1.05em] min-w-[1.05em] -translate-y-[0.2em] items-center justify-center rounded px-[0.2em] align-middle text-[0.7em] font-semibold leading-none text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-900 hover:text-white hover:ring-brand-900"
                    >
                      {c.n}
                    </button>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {rendered}
          </ReactMarkdown>
        </div>

        {!isUser && !isSystem && citedDocs.length > 0 && (
          <div className="msg-sources flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-brand-100">
            <span className="mr-0.5 text-[0.72em] font-semibold uppercase tracking-[0.08em] text-ink-muted">Sources</span>
            {citedDocs.map((c) => (
              <button
                key={c.document_id || c.file_name || c.n}
                type="button"
                onClick={() => onCite?.(c)}
                className="inline-flex max-w-[260px] items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[0.8em] font-medium text-brand-900 transition hover:bg-brand-100"
              >
                <IconDoc size={11} />
                <span className="truncate">{citationTitle(c)}</span>
              </button>
            ))}
          </div>
        )}

        {!isUser && !isSystem && citedDocs.length === 0 && sources.length > 0 && (
          <div className="msg-sources border-t border-brand-100 text-[0.8em] text-ink-muted">Based on: {sources.join(", ")}</div>
        )}
      </div>
    </div>
  );
}

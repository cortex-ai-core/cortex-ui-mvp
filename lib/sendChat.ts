import { mergeIdentity } from "@/lib/identity/identityMiddleware";
import type { ChatMeta, Citation } from "@/lib/citations";

let activeRequest = false;

export type SendChatConfig = {
  namespace: string;
  privateMode: boolean;
  ephemeralContext?: string;
  toneMode: string;
  identity: { userId: string; role: string; namespace: string };
  /** stream tokens via /api/chat/stream. Off by default: the answer arrives whole. */
  stream?: boolean;
  /** called once the sources are known, before the first token */
  onSources?: (sources: ChatMeta["sources"], mode?: ChatMeta["mode"]) => void;
};

function backendUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORTEX_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORTEX_SERVER_URL?.trim() ||
    "http://localhost:8080"
  );
}

function tokenFromStorage() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function metaFrom(data: any): ChatMeta {
  return {
    citations: Array.isArray(data?.citations) ? (data.citations as Citation[]) : [],
    sources: Array.isArray(data?.sources) ? data.sources : [],
    mode: data?.mode,
  };
}

// ----------------------------------------------------------------
// Parse a server-sent-events body: yields { event, data } objects.
// ----------------------------------------------------------------
async function* readSse(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        yield { event, data: JSON.parse(data) };
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

export async function sendChat(
  sessionId: string,
  message: string,
  onFinalText: (value: string, meta?: ChatMeta) => void,
  onToken: (value: string) => void,
  config: SendChatConfig
) {
  if (activeRequest) {
    console.warn("Request already in flight; ignoring parallel send.");
    return;
  }
  activeRequest = true;

  try {
    const { namespace, privateMode, ephemeralContext = "", toneMode, identity: identityFromClient } = config;

    if (!identityFromClient?.userId || !identityFromClient?.role || !identityFromClient?.namespace) {
      throw new Error("Invalid identity payload.");
    }

    const selectedDivision = toneMode === "neutral" ? null : toneMode;
    const identity = mergeIdentity(selectedDivision);

    const payload = {
      sessionId,
      message,
      namespace,
      privateMode,
      ephemeralContext, // attached files ride along in every mode; privateMode only disables shared retrieval
      toneMode,
      identity: {
        ...identityFromClient,
        selectedDivision,
        effectivePersona: identity.effectivePersona,
        core: identity.core,
        division: identity.division,
      },
    };

    const token = tokenFromStorage();
    if (!token) throw new Error("Authentication required — no token available.");

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const base = backendUrl();
    const wantStream = config.stream === true;

    // ------------------------------------------------------------
    // Streaming path
    // ------------------------------------------------------------
    if (wantStream) {
      let res: Response | null = null;
      try {
        res = await fetch(`${base}/api/chat/stream`, { method: "POST", headers, body: JSON.stringify(payload) });
      } catch {
        res = null;
      }

      if (res && res.ok && res.body && (res.headers.get("content-type") || "").includes("text/event-stream")) {
        let finished = false;
        for await (const { event, data } of readSse(res)) {
          if (event === "sources") {
            config.onSources?.(data?.sources || [], data?.mode);
          } else if (event === "token") {
            if (typeof data?.text === "string") onToken(data.text);
          } else if (event === "done") {
            finished = true;
            const reply = data?.finalAnswer ?? data?.message ?? "Cortéx response unavailable.";
            onFinalText(reply, metaFrom(data));
          } else if (event === "error") {
            finished = true;
            onFinalText(data?.error || "Temporary issue — please retry.");
          }
        }
        if (!finished) onFinalText("The connection dropped before the answer finished. Please try again.");
        return;
      }
      // 404 / non-SSE → older backend; fall through to JSON
    }

    // ------------------------------------------------------------
    // JSON path
    // ------------------------------------------------------------
    const res = await fetch(`${base}/api/chat`, { method: "POST", headers, body: JSON.stringify(payload) });

    if (!res.ok) {
      if (res.status === 504) {
        onFinalText("Model timeout — please retry.");
        return;
      }
      throw new Error(`Chat request failed: ${res.status}`);
    }

    const data = await res.json();
    if (data?.error) {
      onFinalText(data.error || "Request blocked due to sensitive data policy.");
      return;
    }

    const reply = data?.message ?? data?.finalAnswer ?? data?.final_answer ?? "Cortéx response unavailable.";
    onFinalText(reply, metaFrom(data));
  } finally {
    activeRequest = false;
  }
}

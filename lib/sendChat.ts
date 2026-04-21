import { mergeIdentity } from "@/lib/identity/identityMiddleware";

let activeRequest = false;

export async function sendChat(
  sessionId: string,
  message: string,
  onFinalText: (value: string) => void,
  _onToken: (value: string) => void,
  config: {
    namespace: string;
    mode: "ephemeral" | "persistent";
    ephemeralFiles?: { name: string; content: string }[];
    toneMode: string;
    identity: {
      userId: string;
      role: string;
      namespace: string;
    };
  }
) {
  if (activeRequest) {
    console.warn("⏳ Request already in-flight — ignoring parallel send.");
    return;
  }
  activeRequest = true;

  try {
    const {
      namespace,
      mode,
      ephemeralFiles = [],
      toneMode,
      identity: identityFromClient,
    } = config;

    // ----------------------------------------------------
    // 🔐 VALIDATE IDENTITY
    // ----------------------------------------------------
    if (
      !identityFromClient?.userId ||
      !identityFromClient?.role ||
      !identityFromClient?.namespace
    ) {
      console.error("❌ INVALID IDENTITY FROM CLIENT", identityFromClient);
      throw new Error("Invalid identity payload.");
    }

    const selectedDivision = toneMode === "neutral" ? null : toneMode;
    const identity = mergeIdentity(selectedDivision);

    // ----------------------------------------------------
    // 🆕 BUILD EPHEMERAL CONTEXT
    // ----------------------------------------------------
    const ephemeralContext = (ephemeralFiles || [])
      .filter((f) => f?.content?.trim())
      .map((f) => `--- ${f.name} ---\n${f.content.trim()}`)
      .join("\n\n");

    // ----------------------------------------------------
    // 1️⃣ Payload
    // ----------------------------------------------------
    const payload = {
      sessionId,
      message,
      namespace,
      mode,
      ephemeralContext,
      toneMode,
      identity: {
        ...identityFromClient,
        selectedDivision,
        effectivePersona: identity.effectivePersona,
        core: identity.core,
        division: identity.division,
      },
    };

    // ----------------------------------------------------
    // 2️⃣ Backend URL
    // ----------------------------------------------------
    const BACKEND =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_CORTEX_API_URL?.trim() ||
      process.env.NEXT_PUBLIC_CORTEX_SERVER_URL?.trim() ||
      "http://localhost:8080";

    const url = `${BACKEND}/api/chat`;

    // ----------------------------------------------------
    // 🔐 TOKEN
    // ----------------------------------------------------
    let token = "";

    if (typeof window !== "undefined") {
      token = localStorage.getItem("token") || "";
    }

    if (!token) {
      console.error("❌ NO AUTH TOKEN");
      throw new Error("Authentication required — no token available.");
    }

    // ----------------------------------------------------
    // 4️⃣ Request
    // ----------------------------------------------------
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      console.error("❌ CHAT ROUTE ERROR RAW:", raw);
      throw new Error(`Chat request failed: ${res.status}`);
    }

    // ----------------------------------------------------
    // 5️⃣ Parse response
    // ----------------------------------------------------
    const data = await res.json();

    // 🔥 DLP SAFE HANDLING (NEW)
    if (data?.error) {
      console.warn("🛡️ DLP / Backend Block Triggered:", data.error);

      const safeMessage =
        data.error ||
        "⚠️ Request blocked due to sensitive data policy.";

      try {
        onFinalText(safeMessage);
      } catch (uiError) {
        console.error("UI update failed:", uiError);
      }

      return {
        reply: safeMessage,
        ragUsed: false,
        matchCount: 0,
        results: [],
        reasoningPath: "DLP_BLOCK",
        raw: data,
      };
    }

    // ----------------------------------------------------
    // ✅ NORMAL FLOW
    // ----------------------------------------------------
    const reply =
      data?.message ??
      data?.finalAnswer ??
      data?.final_answer ??
      "Cortéx response unavailable.";

    try {
      onFinalText(reply);
    } catch (uiError) {
      console.error("UI update failed:", uiError);
    }

    return {
      reply,
      ragUsed: data?.ragApplied ?? false,
      matchCount: data?.matchCount ?? 0,
      results: Array.isArray(data?.results) ? data.results : [],
      reasoningPath: data?.reasoningPath ?? null,
      raw: data,
    };

  } catch (err) {
    console.error("❌ sendChat error:", err);
    throw err;

  } finally {
    activeRequest = false;
  }
}

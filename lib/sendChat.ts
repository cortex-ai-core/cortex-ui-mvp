import { mergeIdentity } from "@/lib/identity/identityMiddleware";

let activeRequest = false;

export async function sendChat(
  sessionId: string,
  message: string,
  onFinalText: (value: string) => void,
  _onToken: (value: string) => void,
  config: {
    namespace: string;
    privateMode: boolean; // 🔥 NEW
    ephemeralContext?: string; // 🔥 NEW
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
      privateMode,
      ephemeralContext = "",
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
    // 1️⃣ Payload (CLEAN — NO LEGACY FIELDS)
    // ----------------------------------------------------
    const payload = {
      sessionId,
      message,
      namespace,
      privateMode, // 🔥 ONLY CONTROL FLAG
      ephemeralContext: privateMode ? ephemeralContext : "", // 🔒 STRICT
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

      if (res.status === 504) {
        const msg = "Model timeout — please retry.";
        onFinalText(msg);
        return;
      }

      throw new Error(`Chat request failed: ${res.status}`);
    }

    // ----------------------------------------------------
    // 5️⃣ Parse response
    // ----------------------------------------------------
    const data = await res.json();

    if (data?.error) {
      const safeMessage =
        data.error ||
        "⚠️ Request blocked due to sensitive data policy.";

      onFinalText(safeMessage);
      return;
    }

    const reply =
      data?.message ??
      data?.finalAnswer ??
      data?.final_answer ??
      "Cortéx response unavailable.";

    onFinalText(reply);

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

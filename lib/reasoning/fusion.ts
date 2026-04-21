// =============================================================
//  CORTÉX — FUSION ENGINE v4 (Step 47 Final + Step 45C Clean)
//  Fix: Remove bracketed markers to prevent diagnostic leakage
// =============================================================

export function fuseEvidenceV2({
  decomposition,
  context,
  ragChunks,
  memory,
  intent,
  weights,
}: {
  decomposition: any;
  context: any;
  ragChunks: any[];
  memory: any[];
  intent: any;
  weights: { ragWeight: number; memoryWeight: number };
}) {
  const signals = [];

  // -------------------------------------------------------------
  // 1️⃣ Decomposition Variables
  // -------------------------------------------------------------
  if (decomposition?.variables?.length) {
    signals.push({
      type: "variable_signals",
      value: decomposition.variables,
      weight: 0.25,
    });
  }

  // -------------------------------------------------------------
  // 2️⃣ Decomposition Signals
  // -------------------------------------------------------------
  if (decomposition?.signals?.length) {
    signals.push({
      type: "decomposition_signals",
      value: decomposition.signals,
      weight: 0.15,
    });
  }

  // -------------------------------------------------------------
  // 3️⃣ RAG Evidence (weighted)
  // -------------------------------------------------------------
  const ragSummary = ragChunks
    ?.map((c) => c.chunk_text)
    .slice(0, 3)
    .join(" ");

  if (ragSummary) {
    signals.push({
      type: "rag_evidence",
      value: ragSummary,
      weight: weights.ragWeight,
    });
  }

  // -------------------------------------------------------------
  // 4️⃣ Memory Evidence (last 5 messages)
  // -------------------------------------------------------------
  const memorySummary = memory
    ?.map((m) => m.content)
    .slice(-5)
    .join(" ");

  if (memorySummary) {
    signals.push({
      type: "memory_evidence",
      value: memorySummary,
      weight: weights.memoryWeight,
    });
  }

  // -------------------------------------------------------------
  // 5️⃣ Intent signal
  // -------------------------------------------------------------
  signals.push({
    type: "intent_signal",
    value: intent?.type || "unknown",
    weight: 0.10,
  });

  // -------------------------------------------------------------
  // 6️⃣ Step 47 — Domain Metadata Pass-through
  // -------------------------------------------------------------
  const domainSignals =
    context?.domainSignals ||
    decomposition?.domainSignals ||
    intent?.domainSignals ||
    [];

  const topDomain =
    context?.topDomain ||
    intent?.topDomain ||
    null;

  if (topDomain) {
    signals.push({
      type: "domain_signal",
      value: `Top domain: ${topDomain}`,
      weight: 0.10,
    });
  }

  // -------------------------------------------------------------
  // 7️⃣ Clean Summary (Step 45C Fix)
  // Removes bracketed markers for natural conversation output.
  // -------------------------------------------------------------
  const summary = signals
    .map((sig) => `${sig.type}: ${Array.isArray(sig.value) ? sig.value.join(" ") : sig.value}`)
    .join("\n")
    .replace(/\[.*?\]/g, "") // ← REMOVE ANY STRAY BRACKETS
    .trim();

  return {
    summary,       // ← CLEAN version for synthesis
    signals,
    domainSignals,
    topDomain,
  };
}

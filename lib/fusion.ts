// =============================================================
//  CORTÉX — FUSION ENGINE v2 (Step 46.4)
//  Combines decomposition signals, context, RAG, memory, intent
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

  // 1️⃣ decomposition variables → evidence
  if (decomposition.variables?.length) {
    signals.push({
      type: "variable_signals",
      value: decomposition.variables,
      weight: 0.25,
    });
  }

  // 2️⃣ causal or temporal cues from signals
  if (decomposition.signals?.length) {
    signals.push({
      type: "decomposition_signals",
      value: decomposition.signals,
      weight: 0.15,
    });
  }

  // 3️⃣ RAG evidence (weighted)
  const ragSummary = ragChunks
    .map((c) => c.chunk_text)
    .slice(0, 3)
    .join(" ");

  if (ragSummary) {
    signals.push({
      type: "rag_evidence",
      value: ragSummary,
      weight: weights.ragWeight,
    });
  }

  // 4️⃣ Memory evidence (weighted)
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

  // 5️⃣ Intent mapping
  signals.push({
    type: "intent",
    value: intent.type,
    weight: 0.10,
  });

  // Final fusion summary
  const summary = signals
    .map((s) => `[${s.type}] ${s.value}`)
    .join("\n");

  return {
    summary,
    signals,
  };
}


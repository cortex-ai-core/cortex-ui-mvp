// =============================================================
//  CORTÉX — REASONING ENGINE (STEP 47 — Final Unified Version)
//  Fully aligned with: decomposition.ts, context.ts,
//  fusionV2.ts, inference.ts, synthesis.ts, decodeIntent.ts
// =============================================================

import { retrieveKnowledge } from "./retrieval";
import { decodeIntent } from "./decodeIntent";      // ✅ Correct decoder
import { buildContext } from "./context";
import { fuseEvidenceV2 } from "./fusion";
import { inferPaths } from "./inference";
import { synthesizeFinalAnswer } from "./synthesis";

export type ReasoningInput = {
  query: string;
  namespace?: string;
  memory?: any[];
  doctrine?: any;
  decomposition?: any;
};

export type ReasoningOutput = {
  answer: string;
  confidence: number;
  bestPath: any;
  evidenceSummary: string;
};

export async function runReasoningEngine(
  input: ReasoningInput
): Promise<ReasoningOutput> {
  const {
    query,
    namespace = "default",
    memory = [],
    doctrine = {},
    decomposition = null,
  } = input;

  // -----------------------------------------------------------
  // 1️⃣ INTENT DECODING (Step 47)
  // -----------------------------------------------------------
  const intent = decodeIntent(query);

  // -----------------------------------------------------------
  // 2️⃣ RAG RETRIEVAL (modern format)
  // -----------------------------------------------------------
  const rag = await retrieveKnowledge(query, namespace);
  const ragMatches = rag.matches || [];

  // -----------------------------------------------------------
  // 3️⃣ CONTEXT BUILDING (Step 47 aligned)
  // -----------------------------------------------------------
  const reasoningContext = decomposition
    ? buildContext(decomposition)
    : buildContext({
        variables: [],
        signals: [],
        domains: [],
        constraints: [],
      });

  // -----------------------------------------------------------
  // 4️⃣ EVIDENCE FUSION (fusionV2)
  // -----------------------------------------------------------
  const fused = fuseEvidenceV2({
    decomposition,
    context: reasoningContext,
    ragChunks: ragMatches,
    memory,
    intent,
    weights: {
      ragWeight: 0.33,
      memoryWeight: 0.33,
    },
  });

  // -----------------------------------------------------------
  // 5️⃣ INFERENCE ENGINE (Step 47 semantics)
  // -----------------------------------------------------------
  const reasoning = inferPaths({
    intent,
    context: reasoningContext,
    evidence: fused,
    doctrine,
    inferenceWeight: 0.34,
    domainSignals: decomposition?.domainSignals ?? [],
    variables: decomposition?.variables ?? [],
    signals: decomposition?.signals ?? [],
    topDomain: decomposition?.topDomain ?? null,
  });

  const { bestPath, confidence = 0.85 } = reasoning;

  // -----------------------------------------------------------
  // 6️⃣ FINAL SYNTHESIS (Step 47)
  // -----------------------------------------------------------
  const finalAnswer = synthesizeFinalAnswer({
    bestPath,
    winningScore: confidence,
    intent,
    rawQuestion: query,
    inference: reasoning,
    fusionSummary: fused.summary,
    topDomain: decomposition?.topDomain ?? null,
    domainSignals: decomposition?.domainSignals ?? [],
  });

  return {
    answer: finalAnswer,
    confidence,
    bestPath,
    evidenceSummary: fused.summary,
  };
}

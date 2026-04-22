// =============================================================
//  CORTÉX — REASONING ENGINE (STEP 47 — Final Unified Version)
// =============================================================

import { retrieveKnowledge } from "./retrieval";
import { decodeIntent } from "./decodeIntent";
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

  const intent = decodeIntent(query);

  const rag = await retrieveKnowledge(query, namespace);
  const ragMatches = rag.matches || [];

  const reasoningContext = decomposition
    ? buildContext(decomposition)
    : buildContext({
        variables: [],
        signals: [],
        domains: [],
        constraints: [],
      });

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

  // ✅ FIXED — STRICT inferPaths CONTRACT
  const reasoning = inferPaths({
    intent,
    context: reasoningContext,
    evidence: fused,
    doctrine,
    inferenceWeight: 0.34,
  });

  const { bestPath, confidence = 0.85 } = reasoning;

  const finalAnswer = synthesizeFinalAnswer({
    bestPath,
    winningScore: confidence,
    intent,
    rawQuestion: query,
    inference: reasoning,
    fusionSummary: fused.summary,
    domainSignals: (decomposition as any)?.domainSignals ?? [], // ✅ KEEP (if allowed)
  });

  return {
    answer: finalAnswer,
    confidence,
    bestPath,
    evidenceSummary: fused.summary,
  };
}

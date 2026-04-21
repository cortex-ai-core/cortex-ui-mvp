// =============================================================
//  CORTÉX — INFERENCE ENGINE v4 (Step 47 Final + Step 45C Fix)
//  Fixes: diagnostic leakage → clean final_answer output
//          reasoning minimized unless diagnostic mode is active
// =============================================================

export function inferPaths({
  intent,
  context,
  evidence,
  doctrine = {},
  inferenceWeight = 0.5,
  isDiagnosticMode = false,   // ← NEW FLAG
}: {
  intent: any;
  context: any;
  evidence: any;
  doctrine: any;
  inferenceWeight: number;
  isDiagnosticMode?: boolean; // ← NEW
}) {
  // ------------------------------
  // Extract signals
  // ------------------------------
  const signals = evidence?.signals || [];
  const contextSummary = context?.summary || "";
  const intentType = intent?.type || "unknown";

  // -------------------------------------------------------------
  // STEP 47 — DOMAIN SIGNAL ENGINE
  // -------------------------------------------------------------
  const domainSignals =
    context?.domainSignals || evidence?.domainSignals || [];
  const topDomain =
    context?.topDomain || evidence?.topDomain || null;

  let domainWeight = 0;

  if (topDomain) {
    const signal = domainSignals.find((d: any) => d.domain === topDomain);
    if (signal) {
      domainWeight = (signal.matchedKeywords?.length || 0) * 0.05;
    }
  }

  // ------------------------------
  // Build reasoning paths
  // ------------------------------
  const paths = [];

  paths.push({
    name: "intent_driven",
    score:
      (intentType !== "unknown" ? 0.35 : 0) +
      (contextSummary ? 0.20 : 0) +
      (signals.length * 0.01) +
      domainWeight,
  });

  paths.push({
    name: "evidence_driven",
    score:
      (signals.length > 0 ? 0.40 : 0) +
      (contextSummary ? 0.10 : 0) +
      (signals.length * 0.02) +
      domainWeight,
  });

  paths.push({
    name: "context_driven",
    score:
      (contextSummary ? 0.45 : 0) +
      (signals.length * 0.005) +
      domainWeight,
  });

  // ------------------------------
  // Normalize and select highest score
  // ------------------------------
  const normalizedPaths = paths.map((p) => ({
    ...p,
    weightedScore: p.score * inferenceWeight,
  }));

  let bestPath = normalizedPaths[0];
  for (const p of normalizedPaths) {
    if (p.weightedScore > bestPath.weightedScore) bestPath = p;
  }

  // Confidence metric
  const maxScore = bestPath.weightedScore;
  const total = normalizedPaths.reduce((a, b) => a + b.weightedScore, 0);
  const confidence = total > 0 ? maxScore / total : 0.25;

  // ------------------------------
  // Step 47 Fix + Step 45C Alignment
  // ------------------------------
  // FULL reasoning ONLY when diagnostic mode is explicitly triggered.
  const reasoning = isDiagnosticMode
    ? generateReasoning({
        bestPath,
        normalizedPaths,
        signals,
        contextSummary,
        topDomain,
        domainWeight,
        intentType,
      })
    : ""; // ← NORMAL MODE RETURNS CLEAN REASONING (NO verbose text)

  return {
    bestPath,
    confidence,
    paths: normalizedPaths,
    reasoning, // ← SAFE: empty in normal chat, verbose only in diag mode
    topDomain,
    domainSignals,
  };
}

// =============================================================
// Natural-language explanation generator (diagnostic only)
// =============================================================
function generateReasoning({
  bestPath,
  normalizedPaths,
  signals,
  contextSummary,
  topDomain,
  domainWeight,
  intentType,
}: any) {
  let explanation = `The "${bestPath.name}" path was selected because:\n`;

  const details = [];

  if (intentType !== "unknown")
    details.push(`• Intent recognized ("${intentType}")`);

  if (contextSummary)
    details.push(`• Context contributed meaningfully`);

  if (signals?.length)
    details.push(`• Evidence contained ${signals.length} matched signals`);

  if (topDomain)
    details.push(
      `• Domain alignment ("${topDomain}") added weight (+${domainWeight.toFixed(
        2
      )})`
    );

  if (!details.length)
    details.push("• It had the strongest logical weighting");

  explanation += details.join("\n");

  explanation += `\n\nConfidence Score: ${(bestPath.weightedScore).toFixed(
    3
  )} vs [${normalizedPaths
    .map((p: any) => p.weightedScore.toFixed(3))
    .join(", ")}]`;

  return explanation.trim();
}

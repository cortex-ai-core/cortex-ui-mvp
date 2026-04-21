// =============================================================
//  CORTÉX — SYNTHESIS ENGINE v8 (Step 47 — CLEAN FINAL ANSWER)
//  Fixes: FINAL_ANSWER clarity, removes diagnostic traces,
//         strips fusion labels, restores natural chat output.
// =============================================================

export function synthesizeFinalAnswer({
  bestPath,
  winningScore,
  intent,
  rawQuestion,
  inference,
  fusionSummary,
}: {
  bestPath: any;
  winningScore: number;
  intent: any;
  rawQuestion: string;
  inference: any;
  fusionSummary: string;
}) {
  const intentType = intent?.type || "unknown";
  const pathName = bestPath?.name || "fallback";
  const domain = intent?.topDomain || bestPath?.topDomain || null;

  // 🔥 Clean up evidence BEFORE synthesis
  const evidence = cleanEvidence(sanitizeEvidence(fusionSummary));
  const reasoning = extractReasoning(inference);

  // =============================================================
  // 0️⃣ FINAL ANSWER EXTRACTOR — removes scaffolding
  // =============================================================
  function produceFinalAnswerOnly(question: string, evidence: string, reasoning: string) {
    return generateNaturalLanguageAnswer(question, evidence, reasoning)
      .replace(/Your question:[\s\S]*?Key evidence:/, "")
      .replace(/Key evidence:[\s\S]*?Why this answer was chosen:/, "")
      .replace(/Why this answer was chosen:[\s\S]*?Final explanation:/, "")
      .replace(/Final explanation:/, "")
      .trim();
  }

  // =============================================================
  // 1️⃣ SAFE DEFAULT — never return empty output
  // =============================================================
  if (!evidence || evidence.length < 3) {
    return wrapDomain(domain, generateFallback(rawQuestion, reasoning));
  }

  // =============================================================
  // 2️⃣ INTERNAL SYNTHESIS (diagnostic scaffolding — internal only)
  // =============================================================
  function synthesizeNL(question: string, evidence: string, reasoning: string): string {
    return (
      `Your question: "${question}"\n\n` +
      `Key evidence:\n${summarize(evidence)}\n\n` +
      (reasoning
        ? `Why this answer was chosen:\n${summarize(reasoning, 260)}\n\n`
        : "") +
      `Final explanation:\n${generateNaturalLanguageAnswer(question, evidence, reasoning)}`
    );
  }

  let fullStructured = "";

  switch (pathName) {
    case "intent_driven":
    case "evidence_driven":
      fullStructured = synthesizeNL(rawQuestion, evidence, reasoning);
      break;

    case "context_driven":
      fullStructured =
        `Context Summary:\n${summarize(evidence)}\n\n` +
        `Interpretation:\n${generateNaturalLanguageAnswer(rawQuestion, evidence, reasoning)}`;
      break;

    default:
      fullStructured = synthesizeNL(rawQuestion, evidence, reasoning);
  }

  // =============================================================
  // 3️⃣ CLEAN FINAL ANSWER (UI-ready)
  // =============================================================
  const clean = produceFinalAnswerOnly(rawQuestion, evidence, reasoning);

  return wrapDomain(domain, clean);
}

// =============================================================
// DOMAIN WRAPPER
// =============================================================
function wrapDomain(domain: string | null, answer: string): string {
  const labels: Record<string, string> = {
    cybersecurity: "📌 Cybersecurity Analysis:",
    advisory: "📌 Strategic Framework:",
    datamanagement: "📌 Data Architecture Insight:",
    recruiting: "📌 Talent Evaluation:",
    ventures: "📌 Venture Analysis:",
    finance: "📌 Financial Interpretation:",
    healthcare: "📌 Clinical/Operational Interpretation:",
    rfp: "📌 Proposal-Ready Response:",
  };
  return domain && labels[domain] ? `${labels[domain]}\n\n${answer}` : answer;
}

// =============================================================
// REASONING EXTRACTOR
// =============================================================
function extractReasoning(inference: any): string {
  if (!inference) return "";
  if (typeof inference === "string") return inference;
  return (
    inference.reasoning ||
    inference.pathReasoning ||
    inference.explanation ||
    ""
  );
}

// =============================================================
// NATURAL LANGUAGE GENERATOR
// =============================================================
function generateNaturalLanguageAnswer(
  question: string,
  evidence: string,
  reasoning: string
): string {
  return (
    `The most accurate answer is:\n\n` +
    `${summarize(evidence, 300)}\n\n` +
    (reasoning ? `Because: ${summarize(reasoning, 260)}\n\n` : "") +
    `In practical terms: ${convertToFriendlyExplanation(evidence)}`
  );
}

// =============================================================
// FRIENDLY EXPLANATION
// =============================================================
function convertToFriendlyExplanation(text: string): string {
  const clean = cleanEvidence(text);
  return (
    clean
      .replace(/\s+/g, " ")
      .replace(/\.\s*\./g, ".")
      .slice(0, 220) + "…"
  );
}

// =============================================================
// FALLBACK
// =============================================================
function generateFallback(question: string, reasoning: string): string {
  return (
    `• Question: ${shorten(question, 140)}\n` +
    (reasoning ? `• Reasoning: ${shorten(reasoning, 160)}\n` : "") +
    `• Interpretation: A general-purpose explanation is safest.`
  );
}

// =============================================================
// CLEANUP HELPERS
// =============================================================
function sanitizeEvidence(text: string) {
  if (!text) return "";
  return text
    .replace(/\[rag_evidence\]/gi, "")
    .replace(/\[memory_evidence\]/gi, "")
    .replace(/\[intent.*?\]/gi, "")
    .trim();
}

function cleanEvidence(text: string): string {
  if (!text) return "";
  return text
    .replace(/decomposition_signals:\s*/gi, "")
    .replace(/variable_signals:\s*/gi, "")
    .replace(/rag_evidence:\s*/gi, "")
    .replace(/memory_evidence:\s*/gi, "")
    .replace(/intent_signal:\s*/gi, "")
    .replace(/domain_signal:\s*/gi, "")
    .trim();
}

function summarize(evidence: string, limit = 240) {
  const clean = (evidence || "").trim();
  return clean.length <= limit ? clean : clean.slice(0, limit) + "…";
}

function shorten(text: string, limit = 140) {
  if (!text) return "";
  const clean = text.trim();
  return clean.length > limit ? clean.slice(0, limit) + "…" : clean;
}

// =============================================================
//  CORTÉX — SOVEREIGN INTENT DECODER v3 (Step 47 Final)
//  Adds domain classification + domain signals for reasoning.
// =============================================================

export function decodeIntent(question: string) {
  const q = question.toLowerCase().trim();

  // =============================================================
  // DOMAIN KEYWORDS (Step 47 Requirement)
  // =============================================================
  const domainKeywords: Record<string, string[]> = {
    cybersecurity: ["zero trust", "encryption", "security", "firewall", "incident", "malware", "soc 2"],
    advisory: ["framework", "strategy", "consulting", "decision", "leadership"],
    datamanagement: ["database", "schema", "rag", "vector", "supabase", "pipeline"],
    recruiting: ["candidate", "resume", "interview", "talent", "placement"],
    healthcare: ["clinical", "patient", "diagnosis", "telemedicine", "care coordination"],
    finance: ["financial", "valuation", "revenue", "forecast", "treasury", "inflation"],
    rfp: ["proposal", "scope", "requirements", "evaluation criteria", "bid"],
    ventures: ["startup", "investor", "equity", "cap table", "fundraising"],
  };

  const domainSignals = [];

  for (const domain in domainKeywords) {
    const matches = domainKeywords[domain].filter((kw) => q.includes(kw));
    if (matches.length > 0) {
      domainSignals.push({ domain, matchedKeywords: matches });
    }
  }

  const topDomain = domainSignals.length ? domainSignals[0].domain : null;

  // =============================================================
  // 1. STRATEGIC — LONG-TERM VISION
  // =============================================================
  const strategicVisionKeywords = [
    "long term", "long-term", "long run", "future state", "future vision",
    "where is this heading", "how does this unfold", "over time"
  ];

  if (strategicVisionKeywords.some(k => q.includes(k))) {
    return { type: "strategic-vision", topDomain, domainSignals };
  }

  // =============================================================
  // 2. STRATEGIC DECISION (less greedy)
  // =============================================================
  const strategicDecisionPatterns = [
    /^should\s/i, /^do we\s/i, /^does\s/i, /^is it time/i, /^is it wise/i,
  ];
  const strategicDecisionKeywords = [
    "should we", "should i", "expand", "invest", "divest",
    "enter", "scale", "move into", "pursue"
  ];

  if (strategicDecisionPatterns.some(p => p.test(q))) {
    return { type: "strategic-decision", topDomain, domainSignals };
  }
  if (strategicDecisionKeywords.some(k => q.includes(k))) {
    return { type: "strategic-decision", topDomain, domainSignals };
  }

  // =============================================================
  // 3. RISK
  // =============================================================
  if (q.includes("risk") || q.includes("downside") || q.includes("threat")) {
    return { type: "risk", topDomain, domainSignals };
  }

  // =============================================================
  // 4. DOCTRINE / ALIGNMENT
  // =============================================================
  if (
    q.includes("align") || q.includes("alignment") ||
    q.includes("doctrine") || q.includes("king’s doctrine") ||
    q.includes("kings doctrine")
  ) {
    return { type: "alignment", topDomain, domainSignals };
  }

  // =============================================================
  // 5. CREATIVE
  // =============================================================
  if (
    q.startsWith("write") || q.includes("story") ||
    q.includes("essay") || q.includes("poem") ||
    /\b(\d+)\s+words?\b/.test(q)
  ) {
    return { type: "creative", topDomain, domainSignals };
  }

  // =============================================================
  // 6. ANALYSIS
  // =============================================================
  if (
    q.includes("explain") || q.includes("analyze") ||
    q.includes("break down") || q.includes("go deeper") ||
    q.includes("why is that")
  ) {
    return { type: "analysis", topDomain, domainSignals };
  }

  // =============================================================
  // 7. DEFAULT
  // =============================================================
  return { type: "general", topDomain, domainSignals };
}

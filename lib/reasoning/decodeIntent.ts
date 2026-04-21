// =============================================================
//  STEP 43 — INTENT DECODER (Unified with Step 47 Engine)
//  Now returns full intent object:
//     { type, topDomain, domainSignals }
//  Without breaking legacy Step 43 behavior.
// =============================================================

export function decodeIntent(raw: string) {
  const q = raw.toLowerCase().trim();

  // -------------------------------------------------------------
  // Step 47 — Domain Keyword Map
  // -------------------------------------------------------------
  const domainKeywords: Record<string, string[]> = {
    cybersecurity: ["zero trust", "malware", "encryption", "soc 2", "security", "firewall"],
    advisory: ["framework", "strategy", "leadership", "evaluation", "consulting"],
    datamanagement: ["rag", "vector", "database", "supabase", "schema"],
    recruiting: ["candidate", "apply", "interview", "talent"],
    healthcare: ["clinical", "patient", "diagnosis", "care coordination"],
    finance: ["revenue", "forecast", "valuation", "treasury"],
    rfp: ["proposal", "requirements", "scope", "evaluation criteria"],
    ventures: ["startup", "funding", "equity", "investor", "cap table"],
  };

  const domainSignals = [];

  for (const domain in domainKeywords) {
    const matches = domainKeywords[domain].filter((kw) => q.includes(kw));
    if (matches.length > 0) {
      domainSignals.push({ domain, matchedKeywords: matches });
    }
  }

  const topDomain = domainSignals.length ? domainSignals[0].domain : null;

  // -------------------------------------------------------------
  // 1. RISK MODE
  // -------------------------------------------------------------
  if (
    q.includes("risk") ||
    q.includes("downside") ||
    q.includes("drawback") ||
    q.includes("worst case")
  ) {
    return { type: "risk", topDomain, domainSignals };
  }

  // -------------------------------------------------------------
  // 2. STRATEGIC / FORECASTING MODE
  // -------------------------------------------------------------
  if (
    q.includes("long-term") ||
    q.includes("long term") ||
    q.includes("long game") ||
    q.includes("future") ||
    q.includes("forecast") ||
    q.includes("direction") ||
    q.includes("trajectory") ||
    q.includes("strategy") ||
    q.includes("meaning behind this pattern") ||
    q.includes("pattern")
  ) {
    return { type: "strategic", topDomain, domainSignals };
  }

  // -------------------------------------------------------------
  // 3. DOCTRINE / ALIGNMENT MODE
  // -------------------------------------------------------------
  if (
    q.includes("align") ||
    q.includes("alignment") ||
    q.includes("does this align") ||
    q.includes("king’s doctrine") ||
    q.includes("kings doctrine") ||
    q.includes("doctrine")
  ) {
    return { type: "alignment", topDomain, domainSignals };
  }

  // -------------------------------------------------------------
  // 4. CREATIVE GENERATION MODE
  // -------------------------------------------------------------
  if (
    q.startsWith("write") ||
    q.startsWith("describe") ||
    q.includes("words") ||
    q.includes("generate") ||
    q.includes("create")
  ) {
    return { type: "creative", topDomain, domainSignals };
  }

  // -------------------------------------------------------------
  // 5. DEPTH / ANALYSIS MODE
  // -------------------------------------------------------------
  if (
    q.includes("why") ||
    q.includes("explain") ||
    q.includes("break down") ||
    q.includes("deeper") ||
    q.includes("analyze")
  ) {
    return { type: "analysis", topDomain, domainSignals };
  }

  // -------------------------------------------------------------
  // 6. DEFAULT MODE
  // -------------------------------------------------------------
  return { type: "unknown", topDomain, domainSignals };
}

// =============================================================
//  CORTÉX — CONTEXT MODELING ENGINE (Step 47 Final)
//  Adds domain metadata required for fusion → inference → synthesis.
// =============================================================

export function buildContext(decomposition: any) {
  const variables = decomposition?.variables || [];
  const signals = decomposition?.signals || [];
  const domains = decomposition?.domains || [];
  const constraints = decomposition?.constraints || [];

  // -------------------------------------------------------------
  // Step 47 — Domain Modeling (CRITICAL)
  // -------------------------------------------------------------
  // If decomposition found domains like ["cybersecurity", "advisory"]
  // We treat the first one as the topDomain and create domainSignals.
  const topDomain = domains.length ? domains[0] : null;

  const domainSignals = domains.map((d: string) => ({
    domain: d,
    matchedKeywords: extractDomainKeywords(signals, d),
  }));

  // -------------------------------------------------------------
  // SUMMARY STRING (used by inference engine)
  // -------------------------------------------------------------
  const summaryParts = [];

  if (variables.length) summaryParts.push(`Variables: ${variables.join(", ")}`);
  if (signals.length) summaryParts.push(`Signals: ${signals.join(", ")}`);
  if (domains.length) summaryParts.push(`Domains: ${domains.join(", ")}`);
  if (constraints.length) summaryParts.push(`Constraints: ${constraints.join(", ")}`);

  const summary = summaryParts.length
    ? summaryParts.join(" | ")
    : "No meaningful context extracted.";

  return {
    variables,
    signals,
    domains,
    constraints,
    summary,       // Required
    topDomain,     // Step 47 addition
    domainSignals, // Step 47 addition
  };
}

// =============================================================
// Domain keyword helper — optional but powerful
// =============================================================
function extractDomainKeywords(signals: string[], domain: string) {
  if (!signals || !signals.length) return [];

  const keywords = [];

  for (const sig of signals) {
    const s = sig.toLowerCase();
    const d = domain.toLowerCase();
    if (s.includes(d)) keywords.push(sig);
  }

  return keywords;
}

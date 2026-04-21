// =============================================================
//  CORTÉX — DECOMPOSITION ENGINE v4 (Step 47 Final)
//  Domain-stable, deduped, ontology-aligned decomposition layer.
//  Produces:
//    - variables
//    - domains (deduped + ontology aligned)
//    - timeHorizon
//    - constraints
//    - signals
//    - domainSignals
//    - topDomain
//    - rawNormalized (Step 47.6 addition)
// =============================================================

import { DOMAIN_ONTOLOGY } from "@/lib/reasoning/domainOntology";

export interface DecompositionResult {
  variables: string[];
  domains: string[];
  timeHorizon: string | null;
  constraints: string[];
  signals: string[];
  domainSignals: { domain: string; matchedKeywords: string[] }[];
  topDomain: string | null;
  rawNormalized: string;
}

export function decomposeQuestion(raw: string): DecompositionResult {
  // -------------------------------------------------------------
  // STEP 47.5 — NORMALIZE TEXT
  // -------------------------------------------------------------
  const q = raw
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // -------------------------------------------------------------
  // VARIABLES (lightweight heuristic extraction)
  // -------------------------------------------------------------
  const variables: string[] = [];
  if (q.includes("collapse") || q.includes("fail")) variables.push("organisational_health");
  if (q.includes("growth")) variables.push("scaling_forces");
  if (q.includes("risk")) variables.push("risk_vectors");
  if (q.includes("timeline") || q.includes("when")) variables.push("temporal_dependency");

  // -------------------------------------------------------------
  // LEGACY DOMAINS — REMOVE or MAP (Step 47 Patch)
  // Map them into modern ontology buckets:
  // -------------------------------------------------------------
  const domains: string[] = [];

  if (q.includes("company") || q.includes("business")) domains.push("advisory");
  if (q.includes("finance") || q.includes("capital")) domains.push("finance");
  if (q.includes("culture") || q.includes("leadership")) domains.push("advisory");
  if (q.includes("market") || q.includes("competition")) domains.push("ventures");

  // -------------------------------------------------------------
  // ONTOLOGY DOMAIN SIGNAL ENGINE (Primary)
  // -------------------------------------------------------------
  const domainSignals: { domain: string; matchedKeywords: string[] }[] = [];

  for (const domain in DOMAIN_ONTOLOGY) {
    const keywords = DOMAIN_ONTOLOGY[domain].keywords;
    const matched = keywords.filter((kw) => q.includes(kw.toLowerCase()));

    if (matched.length > 0) {
      domainSignals.push({ domain, matchedKeywords: matched });
    }
  }

  // Merge ontology-derived domains
  domains.push(...domainSignals.map((d) => d.domain));

  // -------------------------------------------------------------
  // DEDUPE DOMAINS (Step 47 Critical Fix)
  // -------------------------------------------------------------
  const dedupedDomains = Array.from(new Set(domains));

  // -------------------------------------------------------------
  // TIME HORIZON DETECTION
  // -------------------------------------------------------------
  let timeHorizon: string | null = null;
  if (q.includes("future") || q.includes("long term")) timeHorizon = "long_term";
  if (q.includes("now") || q.includes("current")) timeHorizon = "short_term";

  // -------------------------------------------------------------
  // CONSTRAINT EXTRACTION
  // -------------------------------------------------------------
  const constraints: string[] = [];
  if (q.includes("limited") || q.includes("lack")) constraints.push("resource_constraint");
  if (q.includes("uncertain") || q.includes("volatile")) constraints.push("market_uncertainty");

  // -------------------------------------------------------------
  // SIGNAL EXTRACTION
  // -------------------------------------------------------------
  const signals: string[] = [];
  if (q.includes("why")) signals.push("causal_analysis");
  if (q.includes("how")) signals.push("mechanistic_analysis");
  if (q.includes("what")) signals.push("structural_decomposition");

  // -------------------------------------------------------------
  // STEP 47 — Determine Top Domain
  // -------------------------------------------------------------
  let topDomain: string | null = null;

  if (domainSignals.length > 0) {
    const sorted = [...domainSignals].sort(
      (a, b) => b.matchedKeywords.length - a.matchedKeywords.length
    );
    topDomain = sorted[0].domain;
  } else if (dedupedDomains.length > 0) {
    topDomain = dedupedDomains[0];
  }

  // -------------------------------------------------------------
  // RETURN STRUCTURED RESULT
  // -------------------------------------------------------------
  return {
    variables,
    domains: dedupedDomains,
    timeHorizon,
    constraints,
    signals,
    domainSignals,
    topDomain,
    rawNormalized: q,
  };
}

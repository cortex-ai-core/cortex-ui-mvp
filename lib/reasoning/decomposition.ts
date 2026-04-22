// =============================================================
//  CORTÉX — DECOMPOSITION ENGINE v4 (Step 47 Final)
//  Domain-stable, deduped, ontology-aligned decomposition layer.
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
  const q = raw
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const variables: string[] = [];
  if (q.includes("collapse") || q.includes("fail")) variables.push("organisational_health");
  if (q.includes("growth")) variables.push("scaling_forces");
  if (q.includes("risk")) variables.push("risk_vectors");
  if (q.includes("timeline") || q.includes("when")) variables.push("temporal_dependency");

  const domains: string[] = [];

  if (q.includes("company") || q.includes("business")) domains.push("advisory");
  if (q.includes("finance") || q.includes("capital")) domains.push("finance");
  if (q.includes("culture") || q.includes("leadership")) domains.push("advisory");
  if (q.includes("market") || q.includes("competition")) domains.push("ventures");

  const domainSignals: { domain: string; matchedKeywords: string[] }[] = [];

  for (const domain in DOMAIN_ONTOLOGY) {
    const keywords = (DOMAIN_ONTOLOGY as any)[domain].keywords; // ✅ FIXED
    const matched = keywords.filter((kw: string) =>
      q.includes(kw.toLowerCase())
    );

    if (matched.length > 0) {
      domainSignals.push({ domain, matchedKeywords: matched });
    }
  }

  domains.push(...domainSignals.map((d) => d.domain));

  const dedupedDomains = Array.from(new Set(domains));

  let timeHorizon: string | null = null;
  if (q.includes("future") || q.includes("long term")) timeHorizon = "long_term";
  if (q.includes("now") || q.includes("current")) timeHorizon = "short_term";

  const constraints: string[] = [];
  if (q.includes("limited") || q.includes("lack")) constraints.push("resource_constraint");
  if (q.includes("uncertain") || q.includes("volatile")) constraints.push("market_uncertainty");

  const signals: string[] = [];
  if (q.includes("why")) signals.push("causal_analysis");
  if (q.includes("how")) signals.push("mechanistic_analysis");
  if (q.includes("what")) signals.push("structural_decomposition");

  let topDomain: string | null = null;

  if (domainSignals.length > 0) {
    const sorted = [...domainSignals].sort(
      (a, b) => b.matchedKeywords.length - a.matchedKeywords.length
    );
    topDomain = sorted[0].domain;
  } else if (dedupedDomains.length > 0) {
    topDomain = dedupedDomains[0];
  }

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

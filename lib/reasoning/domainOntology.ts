 // =============================================================
 //  CORTÉX — DOMAIN ONTOLOGY (Step 47 — Final Unified Version)
 //  Canonical domain vocabulary for decomposition, intent, fusion,
 //  inference, and synthesis wrappers.
 // =============================================================

export const DOMAIN_ONTOLOGY = {
  cybersecurity: {
    keywords: [
      "security", "cyber", "cybersecurity", "breach", "phishing",
      "malware", "attack", "zero trust", "vulnerability",
      "ransomware", "endpoint", "network", "identity",
      "infosec", "soc2", "mitigation", "audit", "siem",
      "governance", "compliance", "secure configuration",
      "hipaa", "nist", "framework", "rbac"
    ]
  },

  advisory: {
    keywords: [
      // Strategy + planning
      "strategy", "strategic", "business strategy", "operating model",
      "business plan", "strategic plan", "business planning",
      "planning horizon", "business model", "execution",
      "organizational", "alignment", "roadmap", "vision",
      "value proposition", "transformation",

      // Leadership + design
      "decision making", "executive alignment", "prioritization",
      "go to market", "competitive advantage", "framework",

      // KING’s philosophy often maps here
      "doctrine", "alignment check", "kings doctrine"
    ]
  },

  datamanagement: {
    keywords: [
      "data", "database", "data system", "data platform", "warehouse",
      "pipelines", "governance", "etl", "elt", "sql",
      "analytics", "quality", "metadata", "lineage",
      "data modeling", "privacy", "catalog",
      "vector", "embedding", "rag", "supabase", "schema"
    ]
  },

  recruiting: {
    keywords: [
      "hiring", "candidate", "interview", "talent",
      "job", "role", "resume", "profile", "screening",
      "assessment", "recruitment", "headhunting"
    ]
  },

  ventures: {
    keywords: [
      "startup", "funding", "valuation", "pitch",
      "investment", "equity", "market fit",
      "due diligence", "cap table", "term sheet",
      "pre seed", "seed round", "series a"
    ]
  },

  finance: {
    keywords: [
      "capital", "revenue", "profit", "valuation", "cash flow",
      "returns", "cost", "ebitda", "forecasting",
      "budgeting", "treasury", "financial analysis",
      "macro", "market cycle", "inflation", "interest rates"
    ]
  },

  healthcare: {
    keywords: [
      "healthcare", "clinical", "patient", "hospital",
      "medical", "provider", "care", "diagnosis",
      "treatment", "telehealth", "hipaa compliance",
      "telemedicine", "remote patient monitoring",
      "perin health", "rpm", "diagnostic"
    ]
  },

  rfp: {
    keywords: [
      "proposal", "requirements", "scope", "deliverables",
      "sow", "rfp", "response", "bid", "evaluation criteria",
      "procurement", "scoring", "solicitation", "award"
    ]
  },

  ai: {
    keywords: [
      "ai", "agent", "rag", "embedding", "vector",
      "cortex", "llm", "model", "pipeline",
      "openai", "prompt", "reasoning", "memory",
      "inference", "architecture"
    ]
  }
};

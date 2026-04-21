export function inferPaths({ intent }) {
  if (!intent?.type) return { bestPath: "general", confidence: 0.5 };

  if (intent.type === "strategic-decision") {
    return { bestPath: "strategic-decision", confidence: 0.9 };
  }

  if (intent.type === "strategic-vision") {
    return { bestPath: "strategic-vision", confidence: 0.9 };
  }

  if (intent.type === "risk") {
    return { bestPath: "risk", confidence: 0.9 };
  }

  if (intent.type === "alignment") {
    return { bestPath: "alignment", confidence: 0.9 };
  }

  if (intent.type === "analysis") {
    return { bestPath: "analysis", confidence: 0.85 };
  }

  if (intent.type === "creative") {
    return { bestPath: "creative", confidence: 0.95 };
  }

  return { bestPath: "general", confidence: 0.6 };
}

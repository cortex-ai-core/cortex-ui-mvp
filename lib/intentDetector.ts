export type IntentType =
  | "executive"
  | "risk"
  | "opportunity"
  | "strategic"
  | "comparative"
  | "general";

export function detectIntent(message: string): IntentType {
  const lower = message.toLowerCase();

  if (lower.includes("summary") || lower.includes("overview"))
    return "executive";

  if (lower.includes("risk") || lower.includes("threat"))
    return "risk";

  if (lower.includes("opportunity") || lower.includes("growth"))
    return "opportunity";

  if (lower.includes("strategy") || lower.includes("plan"))
    return "strategic";

  if (lower.includes("compare") || lower.includes("vs"))
    return "comparative";

  return "general";
}


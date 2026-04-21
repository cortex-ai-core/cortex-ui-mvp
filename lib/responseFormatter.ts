import { IntentType } from "./intentDetector";

export function buildSystemInstruction(intent: IntentType): string {
  switch (intent) {
    case "executive":
      return `You are an executive intelligence system.
Respond in this format:

Executive Summary:
Key Insights:
Risks:
Opportunities:
Recommended Actions:`;


    case "risk":
      return `You are a risk advisory system.
Respond in this format:

Executive Summary:
Primary Risks:
Impact Analysis:
Mitigation Options:
Recommended Actions:`;


    case "strategic":
      return `You are a strategic advisor.
Respond in this format:

Strategic Overview:
Key Leverage Points:
Risks:
Opportunities:
Recommended Actions:`;


    case "comparative":
      return `You are a comparative analyst.
Respond in this format:

Comparison Summary:
Key Differences:
Strengths:
Weaknesses:
Recommendation:`;


    default:
      return `Respond clearly, concisely, and grounded in retrieved documents.
If multiple documents are provided, synthesize them holistically.
Avoid listing documents individually.`;
  }
}

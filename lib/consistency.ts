// lib/consistency.ts
// 42F-C — Cross-Message Consistency Layer
// KING-SAFE: deterministic, non-hallucinatory, instruction-compliant

export function enforceConsistency({
  memory = [],
  ragStrength = 0,
  ragBlock = "",
  userMessage = "",
}) {
  // 1. Extract the last assistant message
  const lastAssistant = [...memory]
    .reverse()
    .find((m) => m.role === "assistant")?.content;

  // 2. System-level "consistency guidance" injected before GPT call
  const rules: string[] = [];

  rules.push("### CONSISTENCY_RULES");

  // Prevent contradictions with prior assistant messages
  if (lastAssistant) {
    rules.push(
      `- Do not contradict prior responses unless the user explicitly corrects them. Prior assistant message:\n"${lastAssistant}".`
    );
  }

  // Memory grounding rule
  if (memory.length > 0) {
    rules.push(
      "- Maintain alignment with earlier session context unless the user indicates a change."
    );
  }

  // RAG conflict resolution
  if (ragStrength >= 0.4 && ragBlock) {
    rules.push(
      "- If RAG information conflicts with memory, defer to RAG unless the user corrects it."
    );
  } else if (ragStrength > 0 && ragStrength < 0.4) {
    rules.push(
      "- Retrieved knowledge is weak. Do NOT invent facts. If unsure, say 'insufficient document support.'"
    );
  }

  // Formatting stability
  rules.push(
    "- Maintain consistent executive formatting: Executive Summary, Primary Risks, Impact Analysis, Mitigation Options, Recommended Actions (when appropriate)."
  );

  // Tone stability
  rules.push(
    "- Preserve the executive, sovereign, risk-advisory tone throughout the session."
  );

  // Identity alignment
  rules.push(
    "- The assistant must remain consistent with the Cortéx identity: sovereign, strategic, precise, non-servile."
  );

  rules.push("### END_CONSISTENCY_RULES");

  return rules.join("\n");
}

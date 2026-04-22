/**
 * CORTÉX — IDENTITY MIDDLEWARE (STEP 45.3)
 * Deterministic, production-safe identity merger.
 */

import CORTEX_CORE_PERSONA from "@/lib/identity/identity";
import DIVISION_PERSONAS from "@/lib/identity/divisionPersonas";

export interface MergedIdentity {
  core: typeof CORTEX_CORE_PERSONA;
  division: any | null;
  effectivePersona: any; // core + division + KING override rules
}

/**
 * mergeIdentity
 * Safely merges the core persona with one selected division persona.
 * KING override: If "king" is chosen, KING becomes the effective persona.
 */
export function mergeIdentity(selectedDivision: string | null): MergedIdentity {
  const core = { ...CORTEX_CORE_PERSONA }; // guarantee immutability

  // Validate division key
  const division =
    selectedDivision &&
    Object.prototype.hasOwnProperty.call(DIVISION_PERSONAS, selectedDivision)
      ? { ...(DIVISION_PERSONAS as any)[selectedDivision] } // ✅ FIXED
      : null;

  // KING override — KING persona becomes authoritative persona
  if (selectedDivision === "king") {
    return {
      core,
      division: (DIVISION_PERSONAS as any).king, // ✅ FIXED
      effectivePersona: { ...core, ...(DIVISION_PERSONAS as any).king }, // ✅ FIXED
    };
  }

  // If a valid division is selected, merge core + division
  const effectivePersona = division
    ? { ...core, ...division }
    : core;

  return {
    core,
    division,
    effectivePersona,
  };
}

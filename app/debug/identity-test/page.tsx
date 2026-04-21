import CORTEX_CORE_PERSONA from "@/lib/identity/identity";
import DIVISION_PERSONAS from "@/lib/identity/divisionPersonas";

export default function Page() {
  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(
        {
          corePersonaName: CORTEX_CORE_PERSONA.name,
          toneCount: CORTEX_CORE_PERSONA.toneDirectives.length,
          personas: Object.keys(DIVISION_PERSONAS),
          kingPersona: DIVISION_PERSONAS.king.name,
        },
        null,
        2
      )}
    </pre>
  );
}

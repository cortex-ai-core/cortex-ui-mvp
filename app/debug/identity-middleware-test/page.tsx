import { mergeIdentity } from "@/lib/identity/identityMiddleware";

export default function Page() {
  const testAdvisory = mergeIdentity("advisory");
  const testKing = mergeIdentity("king");
  const testCyber = mergeIdentity("cybersecurity");
  const testNull = mergeIdentity(null);

  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(
        {
          advisoryEffectiveName: testAdvisory.effectivePersona.name,
          kingEffectiveName: testKing.effectivePersona.name,
          cyberEffectiveName: testCyber.effectivePersona.name,
          nullEffectiveName: testNull.effectivePersona.name,
          advisoryDivisionId: testAdvisory.division?.id,
          kingOverride: testKing.division?.id, // should be king
        },
        null,
        2
      )}
    </pre>
  );
}

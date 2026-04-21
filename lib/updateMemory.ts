// ============================================================
//  CORTÉX — Memory Update Client (Step 30C)
//  Sends doctrine/tone/identity/rules → backend memory engine
// ============================================================

export async function updateMemory(update: Record<string, any>) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_CORTEX_API_URL;

    const res = await fetch(`${apiUrl}/api/memory/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cortex-ui": "true",
      },
      body: JSON.stringify(update),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Memory update failed: ${res.status} → ${err?.error || "Unknown error"}`
      );
    }

    return await res.json();
  } catch (err: any) {
    console.error("❌ Memory update error:", err);
    throw err;
  }
}


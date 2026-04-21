"use client";

import { useState } from "react";

export default function MemoryConsole() {
  const [doctrine, setDoctrine] = useState("");
  const [identity, setIdentity] = useState("");
  const [tone, setTone] = useState("");
  const [rules, setRules] = useState("");
  const [mission, setMission] = useState("");
  const [status, setStatus] = useState("");

  async function update(field: string, value: any) {
    setStatus("Updating…");

    const res = await fetch("/api/memory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      setStatus("❌ Update failed");
    } else {
      setStatus("✅ Update stored in Cortéx memory");
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        🧠 Cortéx Memory Console
      </h1>

      <p style={{ marginBottom: "20px" }}>
        This console updates the **Intelligence Layer** of Cortéx:
        doctrine, identity, tone, rules, and mission.
        <br />
        Future steps will encrypt and lock this down (Step 31).
      </p>

      {status && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f0f0f0",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          {status}
        </div>
      )}

      {/* DOCTRINE */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Doctrine</h2>
        <textarea
          value={doctrine}
          onChange={(e) => setDoctrine(e.target.value)}
          placeholder="Enter KING's Doctrine…"
          style={{ width: "100%", height: "120px", padding: "12px" }}
        />
        <button
          onClick={() => update("doctrine", doctrine)}
          style={{ marginTop: "10px" }}
        >
          Update Doctrine
        </button>
      </section>

      {/* IDENTITY */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Identity</h2>
        <input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="Cortéx identity…"
          style={{ width: "100%", padding: "12px" }}
        />
        <button
          onClick={() => update("identity", identity)}
          style={{ marginTop: "10px" }}
        >
          Update Identity
        </button>
      </section>

      {/* TONE */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Tone</h2>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="Strategic, sovereign, direct…"
          style={{ width: "100%", padding: "12px" }}
        />
        <button
          onClick={() => update("tone", tone)}
          style={{ marginTop: "10px" }}
        >
          Update Tone
        </button>
      </section>

      {/* KING RULES */}
      <section style={{ marginBottom: "30px" }}>
        <h2>King’s Rules</h2>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="One rule per line…"
          style={{ width: "100%", height: "120px", padding: "12px" }}
        />
        <button
          onClick={() => update("kingRules", rules.split("\n").filter(Boolean))}
          style={{ marginTop: "10px" }}
        >
          Update Rules
        </button>
      </section>

      {/* MISSION */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Mission</h2>
        <textarea
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Define Cortéx mission…"
          style={{ width: "100%", height: "120px", padding: "12px" }}
        />
        <button
          onClick={() => update("mission", mission)}
          style={{ marginTop: "10px" }}
        >
          Update Mission
        </button>
      </section>
    </div>
  );
}


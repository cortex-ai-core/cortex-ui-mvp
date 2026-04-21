"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } else {
      alert("Invalid credentials");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8] px-4">

      {/* CARD */}
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">

        {/* HEADER */}
        <h1 className="text-3xl font-semibold text-center mb-2">
          Cortéx
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Private Intelligence System
        </p>

        {/* FORM */}
        <div className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Username"
            className="w-full h-12 px-4 border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full h-12 px-4 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full h-12 bg-black text-white rounded-lg font-medium hover:bg-[#222] transition"
          >
            Sign In
          </button>

        </div>
      </div>
    </div>
  );
}

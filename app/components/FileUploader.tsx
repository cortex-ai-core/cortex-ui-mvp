"use client";

import { useState } from "react";

export default function FileUploader({ onUploadComplete, namespace }: any) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");

  async function handleUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("Reading file...");

    try {
      let text = "";

      // ----------------------------------------------------
      // 1️⃣ Extract text
      // ----------------------------------------------------
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = result.value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("File is empty after parsing.");
      }

      setStatus("Uploading to Cortéx...");

      // ----------------------------------------------------
      // 2️⃣ Backend + Auth
      // ----------------------------------------------------
      const BACKEND =
        process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
        "http://localhost:8080";

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : "";

      if (!token) {
        throw new Error("Missing auth token.");
      }

      if (!namespace) {
        throw new Error("Missing namespace.");
      }

      // ----------------------------------------------------
      // 3️⃣ Send to /ingest (CORRECT PIPELINE)
      // ----------------------------------------------------
      const res = await fetch(`${BACKEND}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          namespace: namespace,
          metadata: {
            filename: file.name,
          },
        }),
      });

      const json = await res.json();
      console.log("INGEST RESPONSE:", json);

      if (!res.ok) {
        throw new Error(json?.error || "Ingest failed.");
      }

      // ----------------------------------------------------
      // 4️⃣ Success
      // ----------------------------------------------------
      setFileName(file.name);
      setStatus("Completed.");
      onUploadComplete?.(json);

    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setStatus("Upload failed.");
      alert(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <label className="block font-semibold mb-2">Upload Document</label>

      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        className="border p-2 rounded"
      />

      {status && <p className="text-sm mt-2">{status}</p>}
      {fileName && <p className="text-sm mt-2">Uploaded: {fileName}</p>}
    </div>
  );
}

"use client";

import React, { useState } from "react";

export default function UploadBox() {
  const [status, setStatus] = useState("");
  const [fileInfo, setFileInfo] = useState<any>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`Upload failed: ${data.error || "Unknown error"}`);
      return;
    }

    setFileInfo(data);
    setStatus("Upload successful!");
  }

  return (
    <div className="p-4 border rounded-xl bg-gray-50 shadow">
      <h2 className="font-semibold text-lg mb-2">📄 Upload Document</h2>

      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleUpload}
        className="border p-2 rounded"
      />

      {status && <p className="mt-3 text-sm">{status}</p>}

      {fileInfo && (
        <div className="mt-4 bg-white p-3 rounded border shadow">
          <h3 className="font-semibold">Uploaded File Info:</h3>
          <p>Original: {fileInfo.originalName}</p>
          <p>Stored: {fileInfo.filename}</p>
          <p>Type: {fileInfo.type}</p>
          <p>Size: {Math.round(fileInfo.size / 1024)} KB</p>
        </div>
      )}
    </div>
  );
}


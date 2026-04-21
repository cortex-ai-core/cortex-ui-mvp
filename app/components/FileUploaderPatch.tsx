"use client";

import { useState } from "react";
import mammoth from "mammoth";

export default function FileUploader({ onUploadComplete }: any) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);

  async function parseFile(file: File): Promise<string> {
    if (file.type === "text/plain") {
      return await file.text();
    }

    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    throw new Error("Unsupported file type");
  }

  async function handleUpload(e: any) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setStatus("Processing files...");

    const token = localStorage.getItem("token");

    try {
      for (const file of files as File[]) {
        setStatus(`Parsing ${file.name}...`);

        const text = await parseFile(file);

        setStatus(`Uploading ${file.name}...`);

        const res = await fetch("http://localhost:8080/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            namespace: "core", // 🔥 or dynamic later
            text,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error("Ingest failed:", json);
          alert(`Failed: ${file.name}`);
          continue;
        }

        setFileNames((prev) => [...prev, file.name]);
      }

      setStatus("Completed.");
      onUploadComplete?.();

    } catch (err: any) {
      console.error(err);
      setStatus("Error occurred.");
      alert(err.message);
    }

    setUploading(false);
  }

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <label className="block font-semibold mb-2">
        Upload Documents (.txt, .docx)
      </label>

      <input
        type="file"
        multiple
        onChange={handleUpload}
        disabled={uploading}
        className="border p-2 rounded"
      />

      {status && <p className="text-sm mt-2">{status}</p>}

      {fileNames.length > 0 && (
        <div className="text-sm mt-2">
          <p className="font-medium">Uploaded:</p>
          <ul className="list-disc ml-5">
            {fileNames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

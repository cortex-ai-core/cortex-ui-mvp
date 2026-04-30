// app/api/upload/cleaner.ts

export function cleanText(raw: string): string {
  let text = raw || "";

  // 1️⃣ Unicode normalization
  text = text.normalize("NFC");

  // 2️⃣ Fix common PDF ligatures
  text = text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/•/g, "-")
    .replace(/\u00A0/g, " "); // NBSP → space

  // 3️⃣ Remove page numbers
  text = text.replace(/\n?\s*Page\s+\d+(\s+of\s+\d+)?\s*\n?/gi, "\n");
  text = text.replace(/\n?\s*\d+\s*\n/g, "\n"); // orphan numbers on their own line

  // 4️⃣ Remove repeated headers/footers (simple heuristic)
  text = text.replace(/-{3,}|_{3,}|\*{3,}/g, ""); // dividers
  text = text.replace(/\n\s*(Confidential|Draft|Resume).*?\n/gi, "\n");

  // 5️⃣ Collapse whitespace + fix broken lines
  text = text
    .replace(/\r/g, "")
    .replace(/\t+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  // 6️⃣ Trim each line
  text = text
    .split("\n")
    .map((l) => l.trim())
    .join("\n");

  // 7️⃣ Final cleanup: remove trailing junk
  text = text.trim();

  return text;
}


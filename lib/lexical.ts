/**
 * Lexical Score Engine (Phase 3A)
 *
 * Purpose:
 * - Boost retrieval accuracy by adding a keyword signal
 * - Complements vector similarity & LLM reranking
 *
 * Output:
 * - Score between 0.0 → 1.0
 */

export function lexicalScore(query: string, text: string) {
  if (!query || !text) return 0;

  // Tokenize
  const qWords = query.toLowerCase().split(/\W+/).filter(w => w.length >= 3);
  const tWords = text.toLowerCase().split(/\W+/);

  if (qWords.length === 0) return 0;

  let overlap = 0;

  // Count overlapping meaningful tokens
  for (const w of qWords) {
    if (tWords.includes(w)) overlap++;
  }

  // Normalize: overlap / total query tokens
  const score = overlap / qWords.length;

  // Clamp 0 → 1
  return Math.min(1, Math.max(0, score));
}


import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function rewriteQuery(query: string) {
  const prompt = `
Rewrite the following query to maximize document retrieval quality.
Expand acronyms, add related synonyms, but keep it concise.

Original Query: "${query}"

Return only the improved query.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 50,
    temperature: 0,
  });

  return res.choices[0].message.content?.trim() || query;
}


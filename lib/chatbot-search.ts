import knowledgebase from "./knowledgebase.json";

export type KnowledgeChunk = { id: string; source: string; title: string; text: string };

const STOPWORDS = new Set([
  "the","is","are","a","an","and","or","of","to","in","on","for","with","how","what",
  "can","do","does","did","i","you","it","its","this","that","my","our","your","we","they","be",
  "have","has","will","would","should","could","about","from","as","at","by","if",
  "me","us","tell","please","hi","hello","hey","help","need","want","looking","like",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

const SYNONYMS: Record<string, string[]> = {
  cost: ["price", "pricing", "fee", "tier", "subscription", "month"],
  price: ["cost", "pricing", "fee", "tier", "subscription", "month"],
  pricing: ["cost", "price", "fee", "tier", "subscription", "month"],
  cheap: ["price", "cost", "pricing"],
  expensive: ["price", "cost", "pricing"],
  buy: ["price", "cost", "pricing", "trial"],
  free: ["trial", "pricing"],
  hire: ["recruitment", "recruit", "candidate", "hiring"],
  hiring: ["recruitment", "recruit", "candidate", "hire"],
  school: ["institution", "university", "college"],
  university: ["institution", "school", "college"],
  student: ["learner", "learning"],
  security: ["encryption", "compliance", "gdpr"],
  connect: ["integration", "integrate", "api"],
  integrate: ["integration", "connect", "api"],
};

function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) for (const syn of SYNONYMS[token] || []) expanded.add(syn);
  return Array.from(expanded);
}

function scoreChunk(queryTokens: string[], chunk: KnowledgeChunk, queryLower: string): number {
  const chunkLower = chunk.text.toLowerCase() + " " + chunk.title.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    const matches = chunkLower.split(token).length - 1;
    if (matches > 0) score += Math.min(matches, 3) * (token.length > 5 ? 2 : 1);
  }
  if (queryLower.length > 4 && chunkLower.includes(queryLower)) score += 6;
  return score;
}

export type SearchResult = KnowledgeChunk & { score: number };

export function searchKnowledgebase(query: string, topN = 3): SearchResult[] {
  const queryTokens = expandQueryTokens(tokenize(query));
  const queryLower = query.toLowerCase().trim();
  if (queryTokens.length === 0) return [];

  const scored = (knowledgebase as KnowledgeChunk[])
    .map((chunk) => ({ ...chunk, score: scoreChunk(queryTokens, chunk, queryLower) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}

export function productLinkFor(sourceOrTitle: string): { label: string; href: string } | null {
  const s = sourceOrTitle.toLowerCase();
  if (s.includes("perfect hr") || s.includes("perfecthr") || s.includes("perfect-hr")) {
    return { label: "Perfect HR", href: "/solutions/perfect-hr" };
  }
  if (s.includes("ai professor") || s.includes("ai-professor")) {
    return { label: "AI Professor", href: "/solutions/ai-professor" };
  }
  if (s.includes("eduvas")) {
    return { label: "Eduvas", href: "/solutions/eduvas" };
  }
  if (s.includes("leadership") || s.includes("leaership")) {
    return { label: "LeadershipOS", href: "/solutions/leadershipos" };
  }
  return null;
}

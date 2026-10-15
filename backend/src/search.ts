import { knowledge } from './knowledge';

// Basic keyword search: score each chunk by how many query words it contains,
// then return the best few.
export function searchKnowledge(query: string, topK = 3): string[] {
  // "How much is whitening?" → ["how", "much", "whitening"]
  const words = query
    .toLowerCase()
    .split(/\W+/)                       // split on anything that isn't a letter/number
    .filter((w) => w.length > 2);       // ignore tiny words like "is", "a", "to"

  const scored = knowledge.map((chunk) => {
    const text = chunk.toLowerCase();
    const score = words.filter((w) => text.includes(w)).length;   // how many words appear
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)          // drop chunks with no matching words
    .sort((a, b) => b.score - a.score)   // best score first
    .slice(0, topK)                      // keep only the top few
    .map((s) => s.chunk);                // return just the text
}

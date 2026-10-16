import OpenAI from 'openai';
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

// How similar are two embeddings? 1 = same meaning, 0 = unrelated
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, lenA = 0, lenB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    lenA += a[i] * a[i];
    lenB += b[i] * b[i];
  }
  return dot / (Math.sqrt(lenA) * Math.sqrt(lenB));
}

// Turn a list of texts into embeddings (one list of 1,536 numbers per text)
async function embed(texts: string[]): Promise<number[][]> {
  const openai = new OpenAI();
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: texts });
  return response.data.map((d) => d.embedding);
}

// The chunks' embeddings are computed ONCE (on the first search) and then reused
let chunkEmbeddings: number[][] | null = null;

// Chunks scoring below this are treated as "not relevant" and dropped.
// Tune it by watching the scores printed in the terminal.
const MIN_SCORE = 0.3;

// Semantic search: find the chunks whose MEANING is closest to the query
export async function semanticSearch(query: string, topK = 3): Promise<string[]> {
  if (!chunkEmbeddings) {
    chunkEmbeddings = await embed(knowledge);              // 1 API call for all 10 chunks
  }
  const [queryEmbedding] = await embed([query]);           // 1 API call for the question

  const scored = knowledge.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunkEmbeddings![i]),
  }));

  scored.sort((a, b) => b.score - a.score);                // highest score first
  for (const s of scored.slice(0, topK)) {
    const mark = s.score >= MIN_SCORE ? '✅' : '❌ (below MIN_SCORE, dropped)';
    console.log(`      ${s.score.toFixed(3)} ${mark}  ${s.chunk.slice(0, 50)}…`);
  }
  return scored
    .slice(0, topK)
    .filter((s) => s.score >= MIN_SCORE)                   // keep only relevant chunks
    .map((s) => s.chunk);
}

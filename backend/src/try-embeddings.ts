import OpenAI from 'openai';

process.loadEnvFile();
const openai = new OpenAI();

const sentences = [
  'how much to make my teeth brighter?',
  'how much does it cost for teeth brightening?',
  'Free parking is behind the building.',
];

// Ask OpenAI to turn each sentence into an embedding (a list of numbers)
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: sentences,
});

// How similar are two embeddings? 1 = same meaning, 0 = unrelated
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, lenA = 0, lenB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];     // multiply matching numbers, add them up
    lenA += a[i] * a[i];    // used to get the length of arrow a
    lenB += b[i] * b[i];    // used to get the length of arrow b
  }
  return dot / (Math.sqrt(lenA) * Math.sqrt(lenB));
}

for (let i = 0; i < sentences.length; i++) {
  const embedding = response.data[i].embedding;
  console.log(`\n"${sentences[i]}"`);
  console.log(`  → ${embedding.length} numbers, starting with:`, embedding.slice(0, 5));
}

const question = response.data[0].embedding;
console.log('\nHow close is each sentence to the question?');
for (let i = 1; i < sentences.length; i++) {
  const score = cosineSimilarity(question, response.data[i].embedding);
  console.log(`  ${score.toFixed(3)}  "${sentences[i]}"`);
}

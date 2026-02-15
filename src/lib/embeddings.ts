import { VoyageAIClient } from 'voyageai';

const MODEL = 'voyage-finance-2';
const MAX_BATCH_SIZE = 128;
const MAX_TEXT_LENGTH = 120_000; // ~30k tokens safe limit for Voyage

let client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (!client) {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');
    client = new VoyageAIClient({ apiKey });
  }
  return client;
}

/** Generate a single embedding vector (1024 dims). */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await generateEmbeddings([text]);
  return result[0];
}

/** Generate embeddings for a batch of texts. Automatically chunks into batches of 128. */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const voyageClient = getClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const response = await voyageClient.embed({
      input: batch,
      model: MODEL,
    });

    if (!response.data) {
      throw new Error('Voyage API returned no embedding data');
    }

    for (const item of response.data) {
      if (!item.embedding) {
        throw new Error('Voyage API returned null embedding');
      }
      allEmbeddings.push(item.embedding as number[]);
    }
  }

  return allEmbeddings;
}

// --- Text preparation functions ---

function truncate(text: string, maxLen: number = MAX_TEXT_LENGTH): string {
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

/** Prepare text for content embedding: title + raw_text. */
export function prepareContentText(title: string, rawText: string): string {
  return truncate(`${title}\n\n${rawText}`);
}

/** Prepare text for analysis embedding: summary + themes + assets. */
export function prepareAnalysisText(
  summary: string,
  themes: string[],
  assets: string[],
): string {
  const parts = [summary];
  if (themes.length > 0) parts.push(`Themes: ${themes.join(', ')}`);
  if (assets.length > 0) parts.push(`Assets: ${assets.join(', ')}`);
  return truncate(parts.join('\n'));
}

/** Prepare text for prediction embedding: claim + metadata. */
export function preparePredictionText(
  claim: string,
  themes: string[],
  assets: string[],
  sentiment: string,
): string {
  const parts = [claim];
  if (themes.length > 0) parts.push(`Themes: ${themes.join(', ')}`);
  if (assets.length > 0) parts.push(`Assets: ${assets.join(', ')}`);
  if (sentiment) parts.push(`Sentiment: ${sentiment}`);
  return truncate(parts.join('\n'));
}

/** Prepare text for source embedding: name + bio + domains. */
export function prepareSourceText(
  name: string,
  bio: string,
  domains: string[],
): string {
  const parts = [name];
  if (bio) parts.push(bio);
  if (domains.length > 0) parts.push(`Domains: ${domains.join(', ')}`);
  return truncate(parts.join('\n'));
}

/** Format embedding array as pgvector-compatible string: [0.1,0.2,...] */
export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

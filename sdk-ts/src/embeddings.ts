/**
 * Embedding providers for ShelMem semantic search.
 *
 * The SDK is provider-agnostic — pass any function that takes text
 * and returns a number[]. OpenAI is provided as a convenience.
 */

export type EmbeddingProvider = (text: string) => Promise<number[]>;

/**
 * Create an OpenAI embedding provider using text-embedding-3-small (1536 dims).
 *
 * Usage:
 *   const embed = openaiEmbeddings(process.env.OPENAI_API_KEY);
 *   const vector = await embed('some text');
 */
export function openaiEmbeddings(apiKey: string): EmbeddingProvider {
  return async (text: string): Promise<number[]> => {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI embeddings failed: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding as number[];
  };
}

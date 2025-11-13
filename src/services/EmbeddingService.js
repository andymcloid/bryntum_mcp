/**
 * Embedding Service
 *
 * Generates embeddings for text chunks using an EmbeddingProvider.
 * Follows Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
 */
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ component: 'EmbeddingService' });

export class EmbeddingService {
  constructor(embeddingProvider) {
    this.provider = embeddingProvider;
  }

  /**
   * Generate embedding for a single chunk
   * @param {object} chunk - Chunk with id, text, and metadata
   * @returns {Promise<{id: string, text: string, embedding: number[], metadata: object}>}
   */
  async embedChunk(chunk) {
    try {
      logger.debug({ chunkId: chunk.id }, 'Generating embedding for chunk');

      const embedding = await this.provider.embed(chunk.text);

      return {
        ...chunk,
        embedding,
      };
    } catch (error) {
      logger.error(
        { error: error.message, chunkId: chunk.id },
        'Failed to generate embedding'
      );
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple chunks in batch
   * @param {Array<object>} chunks - Array of chunks
   * @param {number} batchSize - Batch size for processing
   * @returns {AsyncIterator<{id: string, text: string, embedding: number[], metadata: object}>}
   */
  async *embedChunks(chunks, batchSize = 50) {
    logger.info({ totalChunks: chunks.length }, 'Starting batch embedding');

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.text);

      try {
        logger.debug(
          { batchStart: i, batchSize: batch.length },
          'Processing batch'
        );

        const embeddings = await this.provider.embedBatch(texts);

        for (let j = 0; j < batch.length; j++) {
          yield {
            ...batch[j],
            embedding: embeddings[j],
          };
        }

        logger.debug(
          { processed: i + batch.length, total: chunks.length },
          'Batch completed'
        );
      } catch (error) {
        logger.error({ error: error.message, batchStart: i }, 'Batch failed');
        throw error;
      }
    }

    logger.info({ totalChunks: chunks.length }, 'Batch embedding completed');
  }

  /**
   * Generate embedding for a query
   * @param {string} query - Search query
   * @returns {Promise<number[]>}
   */
  async embedQuery(query) {
    try {
      logger.debug({ queryLength: query.length }, 'Generating query embedding');
      return await this.provider.embed(query);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate query embedding');
      throw error;
    }
  }
}

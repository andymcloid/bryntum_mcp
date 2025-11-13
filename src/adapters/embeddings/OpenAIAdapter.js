/**
 * OpenAI Embedding Adapter
 *
 * Implements EmbeddingProvider interface using OpenAI's API.
 * Follows Single Responsibility Principle (SRP) and Liskov Substitution Principle (LSP).
 */
import OpenAI from 'openai';
import { EmbeddingProvider } from '../../core/EmbeddingProvider.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'OpenAIAdapter' });

export class OpenAIAdapter extends EmbeddingProvider {
  constructor(apiKey, model = 'text-embedding-3-small') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.dimensions = this._getDimensionsForModel(model);
  }

  /**
   * Get embedding dimensions based on model
   * @private
   */
  _getDimensionsForModel(model) {
    const dimensionsMap = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    return dimensionsMap[model] || 1536;
  }

  async embed(text) {
    try {
      logger.debug({ textLength: text.length }, 'Generating embedding');

      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate embedding');
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  async embedBatch(texts) {
    try {
      logger.debug({ count: texts.length }, 'Generating batch embeddings');

      // OpenAI supports up to 2048 inputs per request, but we'll batch smaller
      const batchSize = 100;
      const embeddings = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        embeddings.push(...response.data.map(d => d.embedding));

        logger.debug(
          { processed: embeddings.length, total: texts.length },
          'Batch progress'
        );
      }

      return embeddings;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to generate batch embeddings');
      throw new Error(`OpenAI batch embedding failed: ${error.message}`);
    }
  }

  getDimensions() {
    return this.dimensions;
  }

  getModelName() {
    return this.model;
  }
}

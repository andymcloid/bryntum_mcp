/**
 * EmbeddingProvider Interface
 *
 * Abstract base class for embedding generation implementations.
 * Follows Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
 */
export class EmbeddingProvider {
  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>}
   */
  async embed(text) {
    throw new Error('Method embed() must be implemented');
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>}
   */
  async embedBatch(texts) {
    throw new Error('Method embedBatch() must be implemented');
  }

  /**
   * Get the dimension of the embeddings
   * @returns {number}
   */
  getDimensions() {
    throw new Error('Method getDimensions() must be implemented');
  }

  /**
   * Get the model name/identifier
   * @returns {string}
   */
  getModelName() {
    throw new Error('Method getModelName() must be implemented');
  }
}

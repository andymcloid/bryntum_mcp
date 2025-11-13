/**
 * VectorStore Interface
 *
 * Abstract base class for vector database implementations.
 * Follows Interface Segregation Principle (ISP) and Dependency Inversion Principle (DIP).
 */
export class VectorStore {
  /**
   * Initialize the vector store connection
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Add documents with embeddings to the store
   * @param {Array<{id: string, text: string, embedding: number[], metadata: object}>} documents
   * @returns {Promise<void>}
   */
  async addDocuments(documents) {
    throw new Error('Method addDocuments() must be implemented');
  }

  /**
   * Search for similar documents using vector similarity
   * @param {number[]} queryEmbedding - The query vector
   * @param {number} limit - Maximum number of results
   * @param {object} filter - Optional metadata filters
   * @returns {Promise<Array<{id: string, text: string, score: number, metadata: object}>>}
   */
  async search(queryEmbedding, limit = 5, filter = {}) {
    throw new Error('Method search() must be implemented');
  }

  /**
   * Get a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<{id: string, text: string, metadata: object} | null>}
   */
  async getDocument(id) {
    throw new Error('Method getDocument() must be implemented');
  }

  /**
   * Delete documents by filter
   * @param {object} filter - Metadata filter
   * @returns {Promise<number>} Number of deleted documents
   */
  async deleteDocuments(filter) {
    throw new Error('Method deleteDocuments() must be implemented');
  }

  /**
   * Close the vector store connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method close() must be implemented');
  }
}

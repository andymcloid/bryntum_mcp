/**
 * DocumentSource Interface
 *
 * Abstract base class for document source implementations.
 * Follows Single Responsibility Principle (SRP) and Open/Closed Principle (OCP).
 */
export class DocumentSource {
  /**
   * Read documents from the source
   * @returns {AsyncIterator<{path: string, content: string, metadata: object}>}
   */
  async *readDocuments() {
    throw new Error('Method readDocuments() must be implemented');
  }

  /**
   * Get total number of documents (if available)
   * @returns {Promise<number | null>}
   */
  async getDocumentCount() {
    return null;
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Optional cleanup, default implementation does nothing
  }
}

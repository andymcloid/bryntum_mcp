/**
 * Query Service
 *
 * Handles RAG queries: embed query, search vector store, format results.
 * Follows Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
 */
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ component: 'QueryService' });

export class QueryService {
  constructor(embeddingService, vectorStore) {
    this.embeddingService = embeddingService;
    this.vectorStore = vectorStore;
  }

  /**
   * Initialize the query service
   */
  async initialize() {
    await this.vectorStore.initialize();
  }

  /**
   * Search for documents matching the query
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array<{id: string, text: string, score: number, metadata: object}>>}
   */
  async search(query, options = {}) {
    const { limit = 5, filter = {}, version, tags } = options;

    try {
      // Determine which version to search
      let searchVersion = version;

      // If no version specified, use latest version
      if (!searchVersion) {
        searchVersion = await this.vectorStore.getLatestVersion();

        if (!searchVersion) {
          logger.warn('No versions found in database');
          return [];
        }

        logger.debug({ latestVersion: searchVersion }, 'Using latest version for search');
      }

      // Add version to filter
      const versionFilter = { ...filter, version: searchVersion };

      logger.info({ query, limit, filter: versionFilter, tags }, 'Searching for documents');

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embedQuery(query);

      // If tags are specified, we need to fetch more results to ensure we have enough after filtering
      const fetchLimit = tags && tags.length > 0 ? limit * 3 : limit;

      // Search vector store with version filter
      let results = await this.vectorStore.search(queryEmbedding, fetchLimit, versionFilter);

      // Post-filter by tags if specified
      if (tags && tags.length > 0) {
        results = results.filter(result => {
          const docTags = result.metadata.tags || [];
          // Check if any of the search tags match any of the document tags
          return tags.some(tag => docTags.includes(tag));
        });

        // Limit to requested amount after filtering
        results = results.slice(0, limit);
      }

      logger.info({ resultCount: results.length, version: searchVersion, tags }, 'Search completed');

      return results;
    } catch (error) {
      logger.error({ error: error.message }, 'Search failed');
      throw error;
    }
  }

  /**
   * Get a specific document by ID
   * @param {string} id - Document ID
   * @returns {Promise<{id: string, text: string, metadata: object} | null>}
   */
  async getDocument(id) {
    logger.debug({ id }, 'Getting document by ID');

    try {
      const document = await this.vectorStore.getDocument(id);

      if (!document) {
        logger.debug({ id }, 'Document not found');
        return null;
      }

      logger.debug({ id }, 'Document retrieved');
      return document;
    } catch (error) {
      logger.error({ error: error.message, id }, 'Failed to get document');
      throw error;
    }
  }

  /**
   * Format search results for RAG context
   * @param {Array<object>} results - Search results
   * @returns {string}
   */
  formatContext(results) {
    if (!results || results.length === 0) {
      return 'No relevant documentation found.';
    }

    return results
      .map((result, index) => {
        const heading = result.metadata.heading || result.metadata.documentPath;
        return `
### Context ${index + 1}: ${heading}
**Source:** ${result.metadata.documentPath}
**Relevance Score:** ${(1 - result.score).toFixed(3)}

${result.text}
`.trim();
      })
      .join('\n\n---\n\n');
  }

  /**
   * Close the query service
   */
  async close() {
    await this.vectorStore.close();
  }
}

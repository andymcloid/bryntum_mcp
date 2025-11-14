/**
 * Document Processor Service
 *
 * Processes documents by chunking and preparing metadata.
 * Follows Single Responsibility Principle (SRP).
 */
import { randomUUID } from 'crypto';
import { chunkByMarkdownHeaders, chunkText } from '../utils/chunker.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../utils/config.js';

const logger = createLogger({ component: 'DocumentProcessor' });

export class DocumentProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || config.chunking.chunkSize;
    this.chunkOverlap = options.chunkOverlap || config.chunking.chunkOverlap;
    this.useMarkdownHeaders = options.useMarkdownHeaders ?? true;
  }

  /**
   * Extract tags from document path
   * Example: "grid/Core/api/Core/helper/DomHelper.md" => ["grid", "Core", "api", "Core", "helper"]
   * - Includes all folders from root to file
   * - Removes filename (last part)
   * - Removes duplicates
   */
  extractTags(documentPath) {
    // Remove file extension and split by path separator
    const pathWithoutExt = documentPath.replace(/\.[^/.]+$/, '');
    const parts = pathWithoutExt.split('/').filter(part => part && part !== '.');

    // Remove filename (last part) but keep all folders including root
    const pathTags = parts.slice(0, -1);

    // Remove duplicates
    const uniqueTags = [...new Set(pathTags)];

    logger.debug({ documentPath, tags: uniqueTags }, 'Extracted tags from path');

    return uniqueTags;
  }

  /**
   * Extract product from document path
   * Example: "docs/grid/guides/..." => "grid"
   * Example: "examples/scheduler/..." => "scheduler"
   */
  extractProduct(documentPath) {
    const products = ['grid', 'scheduler', 'schedulerpro', 'gantt', 'calendar', 'taskboard'];
    const pathLower = documentPath.toLowerCase();

    for (const product of products) {
      if (pathLower.includes(`/${product}/`) || pathLower.startsWith(`${product}/`)) {
        return product;
      }
    }

    return 'core'; // Default product
  }

  /**
   * Extract framework from document path
   * Example: "docs/react/..." => "react"
   * Example: "examples/angular/..." => "angular"
   */
  extractFramework(documentPath) {
    const frameworks = ['react', 'angular', 'vue', 'vanilla'];
    const pathLower = documentPath.toLowerCase();

    for (const framework of frameworks) {
      if (pathLower.includes(`/${framework}/`) || pathLower.startsWith(`${framework}/`)) {
        return framework;
      }
    }

    return 'vanilla'; // Default framework
  }

  /**
   * Extract document type from document path
   * Example: "docs/guides/..." => "guide"
   * Example: "api/..." => "api"
   * Example: "examples/..." => "example"
   */
  extractType(documentPath) {
    const pathLower = documentPath.toLowerCase();

    if (pathLower.includes('/guides/') || pathLower.includes('/guide/')) {
      return 'guide';
    }
    if (pathLower.includes('/api/') || pathLower.startsWith('api/')) {
      return 'api';
    }
    if (pathLower.includes('/examples/') || pathLower.includes('/example/')) {
      return 'example';
    }
    if (pathLower.includes('/concepts/') || pathLower.includes('/concept/')) {
      return 'concept';
    }

    return 'guide'; // Default type
  }

  /**
   * Process a single document into chunks
   * @param {object} document - Document with path, content, and metadata
   * @returns {Array<{id: string, text: string, metadata: object}>}
   */
  processDocument(document) {
    logger.debug({ path: document.path }, 'Processing document');

    // NO CHUNKING - Keep entire document as one chunk
    const chunkId = randomUUID();

    // Extract metadata from document path
    const tags = this.extractTags(document.path);
    const product = this.extractProduct(document.path);
    const framework = this.extractFramework(document.path);
    const type = this.extractType(document.path);

    const processedChunks = [{
      id: chunkId,
      text: document.content,
      metadata: {
        ...document.metadata,
        documentPath: document.path,
        path: document.path,
        tags,       // Auto-generated tags from path
        product,    // Auto-extracted product
        framework,  // Auto-extracted framework
        type,       // Auto-extracted document type
        chunkIndex: 0,
        totalChunks: 1,
        heading: '',
        chunkId,
      },
    }];

    logger.debug(
      { path: document.path, chunks: 1, tags, product, framework, type },
      'Document processed (no chunking)'
    );

    return processedChunks;
  }

  /**
   * Process multiple documents
   * @param {AsyncIterator<object>} documents
   * @returns {AsyncIterator<{id: string, text: string, metadata: object}>}
   */
  async *processDocuments(documents) {
    for await (const document of documents) {
      try {
        const chunks = this.processDocument(document);
        for (const chunk of chunks) {
          yield chunk;
        }
      } catch (error) {
        logger.error(
          { error: error.message, path: document.path },
          'Failed to process document'
        );
      }
    }
  }

  /**
   * Chunk by markdown headers
   * @private
   */
  _chunkByHeaders(content) {
    return chunkByMarkdownHeaders(content, this.chunkSize);
  }

  /**
   * Chunk by size
   * @private
   */
  _chunkBySize(content) {
    return chunkText(content, this.chunkSize, this.chunkOverlap);
  }
}

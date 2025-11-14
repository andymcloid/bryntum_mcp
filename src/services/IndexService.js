/**
 * Index Service
 *
 * Orchestrates the indexing pipeline: source -> process -> store.
 * Weaviate handles embedding automatically via text2vec-openai module.
 * Follows Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
 */
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ component: 'IndexService' });

export class IndexService {
  constructor(documentSource, documentProcessor, vectorStore) {
    this.documentSource = documentSource;
    this.documentProcessor = documentProcessor;
    this.vectorStore = vectorStore;
  }

  /**
   * Index all documents from the source
   * @param {object} options - Indexing options
   * @returns {Promise<{documentsProcessed: number, chunksIndexed: number}>}
   */
  async indexDocuments(options = {}) {
    const { batchSize = 50, clearExisting = false, version, onProgress } = options;

    if (!version) {
      throw new Error('Version is required for indexing');
    }

    logger.info({ version }, 'Starting document indexing');

    try {
      // Report progress helper
      const reportProgress = (stage, progress, message, data = {}) => {
        if (onProgress) {
          onProgress({ stage, progress, message, version, ...data });
        }
      };

      reportProgress('initializing', 0, 'Initializing vector store');

      // Initialize vector store
      await this.vectorStore.initialize();

      // Check if version exists and delete it (overwrite behavior)
      const existingVersions = await this.vectorStore.getAllVersions();
      if (existingVersions.includes(version)) {
        logger.info({ version }, 'Version exists, deleting before re-indexing');
        reportProgress('clearing', 5, `Overwriting existing version: ${version}`);
        await this.vectorStore.deleteByVersion(version);
      }

      // Clear ALL existing documents if requested
      if (clearExisting) {
        logger.info('Clearing all existing documents');
        reportProgress('clearing', 5, 'Clearing all documents');
        // TODO: Implement clear all functionality
      }

      reportProgress('extracting', 10, 'Reading documents from source');

      // Get document count for progress calculation
      const totalDocs = await this.documentSource.getDocumentCount();
      reportProgress('extracting', 15, `Found ${totalDocs} documents to process`, { totalDocuments: totalDocs });

      let documentsProcessed = 0;
      let chunksIndexed = 0;
      let chunks = [];

      // Read and process documents
      const documents = this.documentSource.readDocuments();
      const processedChunks = this.documentProcessor.processDocuments(documents);

      reportProgress('processing', 20, 'Processing and chunking documents');

      for await (const chunk of processedChunks) {
        // Add version to chunk metadata
        chunk.metadata.version = version;

        // Add version to tags array
        if (!chunk.metadata.tags.includes(version)) {
          chunk.metadata.tags = [...chunk.metadata.tags, version];
        }

        chunks.push(chunk);

        // Track documents (only count when we see the first chunk of a document)
        if (chunk.metadata.chunkIndex === 0) {
          documentsProcessed++;

          // Calculate progress: 20% to 95% based on documents processed
          // 20-95 gives us 75% range for actual processing
          const progressPercent = 20 + Math.floor((documentsProcessed / totalDocs) * 75);
          reportProgress(
            'processing',
            progressPercent,
            `Processing ${documentsProcessed}/${totalDocs} documents`,
            { documentsProcessed, totalDocuments: totalDocs, chunksIndexed }
          );
        }

        // Process in batches
        if (chunks.length >= batchSize) {
          await this.vectorStore.addDocuments(chunks);
          chunksIndexed += chunks.length;
          chunks = [];
        }
      }

      // Process remaining chunks
      if (chunks.length > 0) {
        await this.vectorStore.addDocuments(chunks);
        chunksIndexed += chunks.length;
      }

      // Cleanup
      reportProgress('finalizing', 98, 'Cleaning up');
      await this.documentSource.cleanup();

      logger.info(
        { documentsProcessed, chunksIndexed },
        'Indexing completed successfully'
      );

      reportProgress('completed', 100, 'Indexing completed successfully', {
        documentsProcessed,
        chunksIndexed,
      });

      return { documentsProcessed, chunksIndexed };
    } catch (error) {
      logger.error({ error: error.message }, 'Indexing failed');
      throw error;
    }
  }
}

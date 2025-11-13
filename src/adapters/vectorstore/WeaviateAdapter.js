/**
 * Weaviate Vector Store Adapter
 *
 * Implements VectorStore interface using Weaviate with hybrid search.
 * Follows Single Responsibility Principle (SRP) and Liskov Substitution Principle (LSP).
 */
import weaviate from 'weaviate-ts-client';
import { VectorStore } from '../../core/VectorStore.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'WeaviateAdapter' });

export class WeaviateAdapter extends VectorStore {
  constructor(host, port = 1900, className = 'Document') {
    super();
    this.host = host;
    this.port = port;
    this.className = className;
    this.client = null;
    this.versionsCache = null;
    this.versionsCacheTime = null;
  }

  async initialize() {
    try {
      logger.info({ host: this.host, port: this.port }, 'Initializing Weaviate');

      // Create Weaviate client
      this.client = weaviate.client({
        scheme: 'http',
        host: `${this.host}:${this.port}`,
      });

      // Check if ready
      const ready = await this.client.misc.liveChecker().do();
      if (!ready) {
        throw new Error('Weaviate is not ready');
      }

      // Create schema if it doesn't exist
      await this.createSchemaIfNotExists();

      logger.info('Weaviate initialized successfully');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize Weaviate');
      throw new Error(`Weaviate initialization failed: ${error.message}`);
    }
  }

  /**
   * Create schema for Document class if it doesn't exist
   */
  async createSchemaIfNotExists() {
    try {
      // Check if class exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some(c => c.class === this.className);

      if (classExists) {
        logger.info({ className: this.className }, 'Schema already exists');
        return;
      }

      // Create new class
      const classObj = {
        class: this.className,
        description: 'Bryntum documentation chunks',
        vectorizer: 'none', // We provide our own vectors from OpenAI
        properties: [
          {
            name: 'text',
            dataType: ['text'],
            description: 'The document chunk text',
          },
          {
            name: 'version',
            dataType: ['text'],
            description: 'Documentation version (e.g., 6.0.0)',
          },
          {
            name: 'path',
            dataType: ['text'],
            description: 'File path in docs repo',
          },
          {
            name: 'product',
            dataType: ['text'],
            description: 'Product name (grid, scheduler, gantt, etc.)',
          },
          {
            name: 'framework',
            dataType: ['text'],
            description: 'Framework (react, angular, vue, vanilla)',
          },
          {
            name: 'type',
            dataType: ['text'],
            description: 'Document type (guide, api, example, concept)',
          },
          {
            name: 'tags',
            dataType: ['text[]'],
            description: 'Auto-generated tags from path',
          },
          {
            name: 'heading',
            dataType: ['text'],
            description: 'Section heading if available',
          },
          {
            name: 'chunkIndex',
            dataType: ['int'],
            description: 'Chunk index in document',
          },
          {
            name: 'totalChunks',
            dataType: ['int'],
            description: 'Total chunks in document',
          },
        ],
      };

      await this.client.schema.classCreator().withClass(classObj).do();

      logger.info({ className: this.className }, 'Schema created successfully');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create schema');
      throw error;
    }
  }

  async addDocuments(documents) {
    try {
      logger.info({ count: documents.length }, 'Adding documents to Weaviate');

      // Batch insert using Weaviate batcher
      let batcher = this.client.batch.objectsBatcher();
      let batchSize = 0;

      for (const doc of documents) {
        const obj = {
          class: this.className,
          properties: {
            text: doc.text,
            version: doc.metadata.version || '',
            path: doc.metadata.documentPath || doc.metadata.path || '',
            product: doc.metadata.product || '',
            framework: doc.metadata.framework || '',
            type: doc.metadata.type || '',
            tags: doc.metadata.tags || [],
            heading: doc.metadata.heading || '',
            chunkIndex: doc.metadata.chunkIndex || 0,
            totalChunks: doc.metadata.totalChunks || 1,
          },
          vector: doc.embedding,
          id: doc.id, // Use provided ID
        };

        batcher = batcher.withObject(obj);
        batchSize++;

        // Flush batch every 100 items
        if (batchSize >= 100) {
          await batcher.do();
          batcher = this.client.batch.objectsBatcher();
          batchSize = 0;
        }
      }

      // Flush remaining items
      if (batchSize > 0) {
        await batcher.do();
      }

      // Invalidate versions cache
      this.versionsCache = null;

      logger.info({ count: documents.length }, 'Documents added successfully');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to add documents');
      throw new Error(`Failed to add documents: ${error.message}`);
    }
  }

  async search(queryEmbedding, limit = 5, filter = {}) {
    try {
      logger.debug({ limit, filter }, 'Searching for similar documents');

      // Build hybrid search query (semantic + BM25)
      let query = this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('text version path product framework type tags heading chunkIndex totalChunks _additional { id score }')
        .withHybrid({
          query: '',  // Empty for pure vector search, or we can extract keywords
          vector: queryEmbedding,
          alpha: 0.75, // 0.75 = more weight on semantic, 0.5 = balanced, 0 = pure BM25
        })
        .withLimit(limit);

      // Apply filters
      if (Object.keys(filter).length > 0) {
        const whereFilter = this.buildWhereFilter(filter);
        if (whereFilter) {
          query = query.withWhere(whereFilter);
        }
      }

      const result = await query.do();

      // Transform results
      const objects = result.data?.Get?.[this.className] || [];

      // Debug: log first result to see what Weaviate returns
      if (objects.length > 0) {
        logger.info({ first_result_additional: objects[0]._additional }, 'Weaviate response debug');
      }

      const results = objects.map(obj => {
        // Hybrid search returns a score between 0-1 where 1 is best match
        // Weaviate returns score as a string, so parse it to number
        const score = parseFloat(obj._additional.score) || 0;

        logger.debug({ score, path: obj.path }, 'Hybrid search score');

        return {
          id: obj._additional.id,
          text: obj.text,
          score, // 0-1 where 1 is best match
          metadata: {
            version: obj.version,
            documentPath: obj.path,
            path: obj.path,
            product: obj.product,
            framework: obj.framework,
            type: obj.type,
            tags: obj.tags || [],
            heading: obj.heading,
            chunkIndex: obj.chunkIndex,
            totalChunks: obj.totalChunks,
          },
        };
      });

      return results;
    } catch (error) {
      logger.error({ error: error.message }, 'Search failed');
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Build Weaviate where filter from simple key-value object
   */
  buildWhereFilter(filter) {
    const conditions = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null || value === undefined) continue;

      // Map our field names to Weaviate schema property names
      const propertyMap = {
        version: 'version',
        documentPath: 'path',
        path: 'path',
        product: 'product',
        framework: 'framework',
        type: 'type',
      };

      const property = propertyMap[key] || key;

      // Handle arrays (like tags)
      if (Array.isArray(value)) {
        // For array filters, we want documents that contain ANY of the values
        const tagConditions = value.map(tag => ({
          path: [property],
          operator: 'Equal',
          valueText: tag,
        }));

        if (tagConditions.length > 0) {
          conditions.push({
            operator: 'Or',
            operands: tagConditions,
          });
        }
      } else {
        conditions.push({
          path: [property],
          operator: 'Equal',
          valueText: String(value),
        });
      }
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return {
      operator: 'And',
      operands: conditions,
    };
  }

  async getDocument(id) {
    try {
      logger.debug({ id }, 'Getting document by ID');

      const result = await this.client.data
        .getterById()
        .withClassName(this.className)
        .withId(id)
        .do();

      if (!result) {
        logger.debug({ id }, 'Document not found');
        return null;
      }

      return {
        id: result.id,
        text: result.properties.text,
        metadata: {
          version: result.properties.version,
          documentPath: result.properties.path,
          path: result.properties.path,
          product: result.properties.product,
          framework: result.properties.framework,
          type: result.properties.type,
          tags: result.properties.tags || [],
          heading: result.properties.heading,
          chunkIndex: result.properties.chunkIndex,
          totalChunks: result.properties.totalChunks,
        },
      };
    } catch (error) {
      logger.error({ error: error.message, id }, 'Failed to get document');
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Get all chunks for a specific document
   */
  async getDocumentChunks(documentPath, version) {
    try {
      logger.debug({ documentPath, version }, 'Getting all chunks for document');

      const whereFilter = {
        operator: 'And',
        operands: [
          {
            path: ['path'],
            operator: 'Equal',
            valueText: documentPath,
          },
          {
            path: ['version'],
            operator: 'Equal',
            valueText: version,
          },
        ],
      };

      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('text version path product framework type tags heading chunkIndex totalChunks _additional { id }')
        .withWhere(whereFilter)
        .withLimit(10000) // Get all chunks
        .do();

      const objects = result.data?.Get?.[this.className] || [];

      // Transform and sort by chunkIndex
      const chunks = objects.map(obj => ({
        id: obj._additional.id,
        text: obj.text,
        metadata: {
          version: obj.version,
          documentPath: obj.path,
          path: obj.path,
          product: obj.product,
          framework: obj.framework,
          type: obj.type,
          tags: obj.tags || [],
          heading: obj.heading,
          chunkIndex: obj.chunkIndex,
          totalChunks: obj.totalChunks,
        },
      }));

      // Sort by chunkIndex
      chunks.sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex);

      logger.debug({ documentPath, version, chunkCount: chunks.length }, 'Retrieved document chunks');

      return chunks;
    } catch (error) {
      logger.error({ error: error.message, documentPath, version }, 'Failed to get document chunks');
      throw new Error(`Failed to get document chunks: ${error.message}`);
    }
  }

  async deleteDocuments(filter) {
    try {
      logger.info({ filter }, 'Deleting documents');

      const whereFilter = this.buildWhereFilter(filter);

      if (!whereFilter) {
        logger.warn('No valid filter provided for deletion');
        return 0;
      }

      await this.client.batch
        .objectsBatchDeleter()
        .withClassName(this.className)
        .withWhere(whereFilter)
        .do();

      // Invalidate cache
      this.versionsCache = null;

      logger.info({ filter }, 'Documents deleted');
      return 0; // Weaviate doesn't return count
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to delete documents');
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Delete all documents for a specific version
   */
  async deleteByVersion(version) {
    try {
      logger.info({ version }, 'Deleting documents by version');

      await this.deleteDocuments({ version });

      logger.info({ version }, 'Version deleted successfully');
    } catch (error) {
      logger.error({ error: error.message, version }, 'Failed to delete version');
      throw new Error(`Failed to delete version: ${error.message}`);
    }
  }

  /**
   * Get all unique versions (with caching)
   */
  async getAllVersions() {
    try {
      // Return cached versions if available (cache for 60 seconds)
      const cacheTimeout = 60000;
      if (this.versionsCache && this.versionsCacheTime && (Date.now() - this.versionsCacheTime < cacheTimeout)) {
        logger.debug({ versions: this.versionsCache }, 'Returning cached versions');
        return this.versionsCache;
      }

      logger.debug('Getting all versions from database');

      // Get all documents and extract unique versions
      // We use a limit high enough to get all documents
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('version')
        .withLimit(10000)
        .do();

      const versions = new Set();
      const objects = result.data?.Get?.[this.className] || [];

      for (const obj of objects) {
        if (obj.version) {
          versions.add(obj.version);
        }
      }

      const versionList = Array.from(versions).sort();

      // Update cache
      this.versionsCache = versionList;
      this.versionsCacheTime = Date.now();

      logger.debug({ versions: versionList }, 'Found versions');

      return versionList;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get versions');
      throw new Error(`Failed to get versions: ${error.message}`);
    }
  }

  /**
   * Get the latest version (highest version string)
   */
  async getLatestVersion() {
    try {
      const versions = await this.getAllVersions();

      if (versions.length === 0) {
        return null;
      }

      const latest = versions[versions.length - 1];
      logger.debug({ latestVersion: latest }, 'Found latest version');

      return latest;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get latest version');
      throw new Error(`Failed to get latest version: ${error.message}`);
    }
  }

  /**
   * Get all unique tags
   */
  async getAllTags() {
    try {
      logger.debug('Getting all tags from database');

      // Query with large limit to get all documents
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('tags')
        .withLimit(10000)
        .do();

      const tags = new Set();
      const objects = result.data?.Get?.[this.className] || [];

      for (const obj of objects) {
        if (obj.tags && Array.isArray(obj.tags)) {
          obj.tags.forEach(tag => tags.add(tag));
        }
      }

      const tagList = Array.from(tags).sort();
      logger.debug({ tags: tagList, count: tagList.length }, 'Found tags');

      return tagList;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get tags');
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Clear all documents from the database (full purge)
   */
  async clearAll() {
    try {
      logger.warn('Clearing all documents from database');

      // Delete the entire class
      await this.client.schema.classDeleter().withClassName(this.className).do();

      // Recreate schema
      await this.createSchemaIfNotExists();

      // Invalidate caches
      this.versionsCache = null;
      this.versionsCacheTime = null;

      logger.info('All documents cleared successfully');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to clear all documents');
      throw new Error(`Failed to clear all documents: ${error.message}`);
    }
  }

  async close() {
    logger.info('Closing Weaviate connection');
    // Weaviate client doesn't need explicit close
    this.client = null;
  }
}

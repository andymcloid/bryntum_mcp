/**
 * Index Route
 *
 * POST /index - Index documents from uploaded zip file (returns jobId immediately)
 * GET /index/:jobId - Get indexing job status
 */

import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { ZipSource } from '../../adapters/sources/ZipSource.js';
import { DocumentProcessor } from '../../services/DocumentProcessor.js';
import { IndexService } from '../../services/IndexService.js';
import { jobManager } from '../../services/JobManager.js';
import { versionMetadataService } from '../../services/VersionMetadataService.js';
import { config } from '../../utils/config.js';

export default async function indexRoutes(fastify) {
  /**
   * Index documents from uploaded zip (background job)
   */
  fastify.post('/', async (request, reply) => {
    const uploadId = nanoid();
    let tempFilePath = null;

    try {
      // Ensure temp directory exists
      await mkdir(config.storage.tempUploadPath, { recursive: true });

      // Parse multipart data - collect all parts
      const parts = request.parts();
      let fileData = null;
      let version = null;

      // Process all parts - must consume all to avoid hanging
      for await (const part of parts) {
        if (part.file) {
          // It's a file
          fileData = part;
          // Save immediately to avoid buffering issues
          tempFilePath = join(config.storage.tempUploadPath, `${uploadId}.zip`);
          await pipeline(part.file, createWriteStream(tempFilePath));
        } else {
          // It's a field
          if (part.fieldname === 'version') {
            version = part.value;
          }
        }
      }

      if (!fileData) {
        return reply.code(400).send({
          error: 'No file uploaded',
        });
      }

      if (!version) {
        // Cleanup temp file
        if (tempFilePath) {
          await unlink(tempFilePath).catch(() => {});
        }
        return reply.code(400).send({
          error: 'Version is required',
          message: 'Please provide a version field with your upload',
        });
      }

      // Validate file type
      if (!fileData.filename.endsWith('.zip')) {
        // Cleanup temp file
        await unlink(tempFilePath).catch(() => {});
        return reply.code(400).send({
          error: 'Only .zip files are supported',
        });
      }

      fastify.log.info({ uploadId, filename: fileData.filename, version }, 'File uploaded');

      // Create a job
      const jobId = jobManager.createJob('index', {
        uploadId,
        filename: fileData.filename,
        tempFilePath,
        version,
      });

      jobManager.updateJob(jobId, {
        status: 'running',
        stage: 'uploading',
        progress: 5,
        message: `File uploaded successfully (version: ${version})`,
        version,
      });

      // Start indexing in background (don't await)
      runIndexingJob(jobId, tempFilePath, version, fastify).catch((error) => {
        fastify.log.error({ jobId, error: error.message }, 'Background indexing failed');
      });

      // Return job ID immediately
      return reply.code(202).send({
        jobId,
        uploadId,
        filename: fileData.filename,
        version,
        message: 'Indexing job started. Use jobId to track progress via WebSocket.',
      });

    } catch (error) {
      fastify.log.error({ error: error.message, uploadId }, 'Upload failed');

      // Cleanup temp file on error
      if (tempFilePath) {
        await unlink(tempFilePath).catch(() => {});
      }

      return reply.code(500).send({
        error: 'Upload failed',
        message: error.message,
      });
    }
  });

  /**
   * Get job status
   */
  fastify.get('/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const job = jobManager.getJob(jobId);

    if (!job) {
      return reply.code(404).send({
        error: 'Job not found',
      });
    }

    return job;
  });

  /**
   * Get all jobs
   */
  fastify.get('/', async () => {
    return {
      jobs: jobManager.getAllJobs(),
      active: jobManager.getActiveJobs(),
    };
  });

  /**
   * Clear all indexed documents (full purge)
   */
  fastify.delete('/all', async (request, reply) => {
    try {
      fastify.log.warn('Clearing all documents from database');

      await fastify.vectorStore.clearAll();

      return {
        success: true,
        message: 'All documents cleared successfully',
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to clear all documents');

      return reply.code(500).send({
        error: 'Failed to clear all documents',
        message: error.message,
      });
    }
  });
}

/**
 * Run indexing job in background
 */
async function runIndexingJob(jobId, tempFilePath, version, fastify) {
  const startTime = Date.now();

  try {
    jobManager.startJob(jobId);

    // Create document source from zip
    const documentSource = new ZipSource(tempFilePath);

    // Create services
    const documentProcessor = new DocumentProcessor();
    const indexService = new IndexService(
      documentSource,
      documentProcessor,
      fastify.embeddingService,
      fastify.vectorStore
    );

    // Index documents with progress reporting
    const result = await indexService.indexDocuments({
      version,
      batchSize: 50,
      clearExisting: false,
      onProgress: (progress) => {
        jobManager.updateJob(jobId, {
          ...progress,
        });
      },
    });

    const duration = Date.now() - startTime;

    // Complete job
    jobManager.completeJob(jobId, {
      ...result,
      version,
      durationMs: duration,
    });

    // Auto-generate metadata from indexed documents
    try {
      fastify.log.info({ version }, 'Generating version metadata');
      await versionMetadataService.generateMetadata(version, fastify.vectorStore);
      fastify.log.info({ version }, 'Version metadata generated');
    } catch (error) {
      fastify.log.error({ error: error.message, version }, 'Failed to generate metadata');
    }

    // Cleanup temp file
    await unlink(tempFilePath).catch(() => {});

    fastify.log.info({ jobId, version, ...result, duration }, 'Indexing job completed');

  } catch (error) {
    fastify.log.error({ jobId, error: error.message }, 'Indexing job failed');

    // Fail job
    jobManager.failJob(jobId, error);

    // Cleanup temp file
    await unlink(tempFilePath).catch(() => {});
  }
}

/**
 * Versions Route
 *
 * GET /versions - Get all indexed versions
 * GET /versions/:version - Get specific version info with metadata
 * POST /versions/:version/metadata - Update version metadata
 */

import { versionMetadataService } from '../../services/VersionMetadataService.js';

export default async function versionsRoutes(fastify) {
  /**
   * Get all versions
   */
  fastify.get('/', async (request, reply) => {
    try {
      const versions = await fastify.vectorStore.getAllVersions();
      const latest = await fastify.vectorStore.getLatestVersion();

      return {
        versions,
        latest,
        count: versions.length,
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get versions');

      return reply.code(500).send({
        error: 'Failed to get versions',
        message: error.message,
      });
    }
  });

  /**
   * Get specific version with metadata
   */
  fastify.get('/:version', async (request, reply) => {
    try {
      const { version } = request.params;

      const versions = await fastify.vectorStore.getAllVersions();

      if (!versions.includes(version)) {
        return reply.code(404).send({
          error: 'Version not found',
        });
      }

      const metadata = await versionMetadataService.getMetadata(version);

      return {
        version,
        metadata: metadata || {},
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get version');

      return reply.code(500).send({
        error: 'Failed to get version',
        message: error.message,
      });
    }
  });

  /**
   * Update version metadata
   */
  fastify.post('/:version/metadata', async (request, reply) => {
    try {
      const { version } = request.params;
      const metadata = request.body;

      const versions = await fastify.vectorStore.getAllVersions();

      if (!versions.includes(version)) {
        return reply.code(404).send({
          error: 'Version not found',
        });
      }

      const updated = await versionMetadataService.updateMetadata(version, metadata);

      return {
        success: true,
        version,
        metadata: updated,
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to update metadata');

      return reply.code(500).send({
        error: 'Failed to update metadata',
        message: error.message,
      });
    }
  });

  /**
   * Regenerate metadata for a version
   */
  fastify.post('/:version/metadata/regenerate', async (request, reply) => {
    try {
      const { version } = request.params;

      const versions = await fastify.vectorStore.getAllVersions();

      if (!versions.includes(version)) {
        return reply.code(404).send({
          error: 'Version not found',
        });
      }

      const metadata = await versionMetadataService.generateMetadata(version, fastify.vectorStore);

      return {
        success: true,
        version,
        metadata,
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to regenerate metadata');

      return reply.code(500).send({
        error: 'Failed to regenerate metadata',
        message: error.message,
      });
    }
  });

  /**
   * Delete a specific version
   */
  fastify.delete('/:version', async (request, reply) => {
    try {
      const { version } = request.params;

      const versions = await fastify.vectorStore.getAllVersions();

      if (!versions.includes(version)) {
        return reply.code(404).send({
          error: 'Version not found',
        });
      }

      fastify.log.warn({ version }, 'Deleting version');

      await fastify.vectorStore.deleteByVersion(version);

      // Also delete metadata
      await versionMetadataService.deleteMetadata(version);

      return {
        success: true,
        version,
        message: `Version ${version} deleted successfully`,
      };

    } catch (error) {
      fastify.log.error({ error: error.message, version: request.params.version }, 'Failed to delete version');

      return reply.code(500).send({
        error: 'Failed to delete version',
        message: error.message,
      });
    }
  });
}

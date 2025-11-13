/**
 * Document Route
 *
 * GET /doc/:id - Get a specific document by ID
 * GET /doc/full/:path - Get all chunks for a document by path
 */

export default async function documentRoutes(fastify) {
  /**
   * Get all chunks for a full document by path (download as file)
   */
  fastify.get('/full/*', async (request, reply) => {
    try {
      const documentPath = request.params['*'];
      const { version } = request.query;

      if (!documentPath) {
        return reply.code(400).send({
          error: 'Document path is required',
        });
      }

      if (!version) {
        return reply.code(400).send({
          error: 'Version parameter is required',
        });
      }

      fastify.log.info({ documentPath, version }, 'Getting full document');

      const chunks = await fastify.vectorStore.getDocumentChunks(documentPath, version);

      if (!chunks || chunks.length === 0) {
        return reply.code(404).send({
          error: 'Document not found',
          path: documentPath,
          version,
        });
      }

      // Reconstruct full document text
      const fullText = chunks.map(chunk => {
        const heading = chunk.metadata.heading ? `\n\n## ${chunk.metadata.heading}\n\n` : '';
        return heading + chunk.text;
      }).join('\n\n');

      // Extract filename from path
      const filename = documentPath.split('/').pop() || 'document.md';

      // Return as downloadable file
      reply
        .header('Content-Type', 'text/markdown; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(fullText);

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get full document');

      return reply.code(500).send({
        error: 'Failed to get full document',
        message: error.message,
      });
    }
  });

  /**
   * Get document/chunk by ID
   * Add ?download=true to download as file
   */
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { download } = request.query;

      if (!id) {
        return reply.code(400).send({
          error: 'Document ID is required',
        });
      }

      fastify.log.info({ id, download }, 'Getting document by ID');

      const document = await fastify.queryService.getDocument(id);

      if (!document) {
        return reply.code(404).send({
          error: 'Document not found',
          id,
        });
      }

      // If download=true, return as file
      if (download === 'true') {
        const path = document.metadata.documentPath || document.metadata.path || 'chunk.txt';
        const filename = `${path.split('/').pop()}_chunk_${document.metadata.chunkIndex + 1}.txt`;

        return reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(document.text);
      }

      // Otherwise return JSON
      return {
        id: document.id,
        text: document.text,
        metadata: document.metadata,
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get document');

      return reply.code(500).send({
        error: 'Failed to get document',
        message: error.message,
      });
    }
  });
}

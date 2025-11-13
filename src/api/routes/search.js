/**
 * Search Route
 *
 * POST /search - Search for documents using semantic similarity
 */

export default async function searchRoutes(fastify) {
  /**
   * Search for documents
   *
   * Body:
   *   - query: string (required)
   *   - limit: number (optional, default: 5)
   *   - filter: object (optional)
   *   - version: string (optional, defaults to latest version)
   *   - tags: array (optional, filter by tags)
   *   - includeContext: boolean (optional, default: false)
   */
  fastify.post('/', async (request, reply) => {
    try {
      const { query, limit = 5, filter = {}, version, tags, includeContext = false } = request.body;

      if (!query || typeof query !== 'string') {
        return reply.code(400).send({
          error: 'Query is required and must be a string',
        });
      }

      if (limit < 1 || limit > 50) {
        return reply.code(400).send({
          error: 'Limit must be between 1 and 50',
        });
      }

      if (tags && !Array.isArray(tags)) {
        return reply.code(400).send({
          error: 'Tags must be an array',
        });
      }

      fastify.log.info({ query, limit, filter, version, tags }, 'Processing search request');

      const startTime = Date.now();

      // Perform search (version defaults to latest if not specified)
      const results = await fastify.queryService.search(query, { limit, filter, version, tags });

      const duration = Date.now() - startTime;

      // Get the actual version that was searched
      const searchedVersion = results.length > 0 ? results[0].metadata.version : version;

      fastify.log.info(
        { query, version: searchedVersion, resultCount: results.length, duration },
        'Search completed'
      );

      const response = {
        query,
        version: searchedVersion,
        resultCount: results.length,
        durationMs: duration,
        results: results.map(result => ({
          id: result.id,
          text: result.text,
          score: result.score || 0,
          relevance: (result.score || 0).toFixed(3), // Score is already similarity (0-1)
          metadata: result.metadata,
        })),
      };

      // Optionally include formatted context for RAG
      if (includeContext) {
        response.context = fastify.queryService.formatContext(results);
      }

      return response;

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Search failed');

      return reply.code(500).send({
        error: 'Search failed',
        message: error.message,
      });
    }
  });

  /**
   * Alias: POST /query
   */
  fastify.post('/query', async (request, reply) => {
    return fastify.inject({
      method: 'POST',
      url: '/search',
      payload: request.body,
    });
  });
}

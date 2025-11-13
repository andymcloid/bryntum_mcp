/**
 * Tags Route
 *
 * GET /tags - Get all available tags from indexed documents
 */

export default async function tagsRoutes(fastify) {
  /**
   * Get all tags
   */
  fastify.get('/', async (request, reply) => {
    try {
      const tags = await fastify.vectorStore.getAllTags();

      return {
        tags,
        count: tags.length,
      };

    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get tags');

      return reply.code(500).send({
        error: 'Failed to get tags',
        message: error.message,
      });
    }
  });
}

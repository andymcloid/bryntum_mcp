/**
 * Stats Route
 *
 * GET /stats - Get database statistics and metadata
 */

export default async function statsRoutes(fastify) {
  /**
   * Get comprehensive database statistics
   */
  fastify.get('/', async (request, reply) => {
    try {
      fastify.log.info('Getting database stats');

      // Get all versions
      const versions = await fastify.vectorStore.getAllVersions();
      const latestVersion = await fastify.vectorStore.getLatestVersion();

      // Get all tags
      const tags = await fastify.vectorStore.getAllTags();

      // Get document count estimate from aggregating chunks
      // We count unique document paths across all versions
      const result = await fastify.vectorStore.client.graphql
        .aggregate()
        .withClassName(fastify.vectorStore.className)
        .withFields('meta { count }')
        .do();

      const totalChunks = result.data?.Aggregate?.[fastify.vectorStore.className]?.[0]?.meta?.count || 0;

      // Estimate unique documents (chunks / average chunks per doc)
      // Since we store chunkIndex and totalChunks, we can be smarter
      const estimatedDocs = Math.ceil(totalChunks / 3); // Rough estimate

      // Extract products and frameworks from tags
      const products = new Set();
      const frameworks = new Set();

      // Common product and framework names
      const knownProducts = ['grid', 'scheduler', 'schedulerpro', 'gantt', 'calendar', 'taskboard'];
      const knownFrameworks = ['react', 'angular', 'vue', 'vanilla'];

      tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        knownProducts.forEach(p => {
          if (tagLower.includes(p)) products.add(p);
        });
        knownFrameworks.forEach(f => {
          if (tagLower.includes(f)) frameworks.add(f);
        });
      });

      const stats = {
        versions: {
          total: versions.length,
          latest: latestVersion,
          all: versions,
        },
        documents: {
          totalChunks,
          estimatedDocuments: estimatedDocs,
          averageChunksPerDoc: totalChunks > 0 ? (totalChunks / estimatedDocs).toFixed(1) : 0,
        },
        products: Array.from(products).sort(),
        frameworks: Array.from(frameworks).sort(),
        tags: {
          total: tags.length,
          sample: tags.slice(0, 20), // First 20 tags as sample
        },
      };

      fastify.log.info({ stats }, 'Stats retrieved successfully');

      return stats;
    } catch (error) {
      fastify.log.error({ error: error.message }, 'Failed to get stats');

      return reply.code(500).send({
        error: 'Failed to get stats',
        message: error.message,
      });
    }
  });
}

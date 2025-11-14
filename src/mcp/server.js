/**
 * MCP Server Implementation
 *
 * Uses official @modelcontextprotocol/sdk to provide MCP protocol support.
 * Thin wrapper around RAG backend services.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const logger = createLogger({ component: 'MCPServer' });

/**
 * Create and configure MCP server using server.tool() method (like aloha-docs)
 */
export function createMCPServer(queryService, vectorStore) {
  const server = new McpServer(
    {
      name: 'bryntum-rag-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool: search_docs
  server.tool(
    'search_docs',
    'Search Bryntum documentation using semantic similarity. Returns relevant documentation chunks.',
    {
      query: z.string().describe('The search query'),
      limit: z.number().min(1).max(50).default(5).describe('Maximum number of results to return (1-50)'),
      version: z.string().optional().describe('Documentation version to search (defaults to latest)'),
      product: z.string().optional().describe('Filter by product (grid, scheduler, gantt, etc.)'),
      framework: z.string().optional().describe('Filter by framework (react, angular, vue, vanilla)'),
    },
    async ({ query, limit = 5, version, product, framework }) => {
      logger.info({ tool: 'search_docs', query, limit }, 'Executing MCP tool');

      try {
        if (!query || typeof query !== 'string') {
          throw new Error('Query is required and must be a string');
        }

        const filter = {};
        if (product) filter.product = product;
        if (framework) filter.framework = framework;

        const results = await queryService.search(query, {
          limit: Math.min(Math.max(limit, 1), 50),
          filter,
          version,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  version: results[0]?.metadata?.version || version,
                  count: results.length,
                  results: results.map((r) => ({
                    id: r.id,
                    text: r.text,
                    score: r.score,
                    metadata: r.metadata,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error: error.message, tool: 'search_docs' }, 'Tool execution failed');
        throw error;
      }
    }
  );

  // Tool: search_examples
  server.tool(
    'search_examples',
    'Search specifically for code examples in Bryntum documentation.',
    {
      query: z.string().describe('The search query'),
      limit: z.number().min(1).max(50).default(5).describe('Maximum number of results to return (1-50)'),
      version: z.string().optional().describe('Documentation version to search (defaults to latest)'),
      product: z.string().optional().describe('Filter by product (grid, scheduler, gantt, etc.)'),
      framework: z.string().optional().describe('Filter by framework (react, angular, vue, vanilla)'),
    },
    async ({ query, limit = 5, version, product, framework }) => {
      logger.info({ tool: 'search_examples', query, limit }, 'Executing MCP tool');

      try {
        if (!query || typeof query !== 'string') {
          throw new Error('Query is required and must be a string');
        }

        const filter = { type: 'example' };
        if (product) filter.product = product;
        if (framework) filter.framework = framework;

        const results = await queryService.search(query, {
          limit: Math.min(Math.max(limit, 1), 50),
          filter,
          version,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  version: results[0]?.metadata?.version || version,
                  count: results.length,
                  results: results.map((r) => ({
                    id: r.id,
                    text: r.text,
                    score: r.score,
                    metadata: r.metadata,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error: error.message, tool: 'search_examples' }, 'Tool execution failed');
        throw error;
      }
    }
  );

  // Tool: get_doc
  server.tool(
    'get_doc',
    'Get a specific document chunk by ID. Use this to retrieve full content after search.',
    {
      id: z.string().describe('Document chunk ID from search results'),
    },
    async ({ id }) => {
      logger.info({ tool: 'get_doc', id }, 'Executing MCP tool');

      try {
        if (!id) {
          throw new Error('Document ID is required');
        }

        const doc = await vectorStore.getDocument(id);

        if (!doc) {
          throw new Error(`Document not found: ${id}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: doc.id,
                  text: doc.text,
                  metadata: doc.metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error: error.message, tool: 'get_doc' }, 'Tool execution failed');
        throw error;
      }
    }
  );

  // Tool: get_full_document
  server.tool(
    'get_full_document',
    'Get the complete full document by reconstructing all chunks. Use this after search to get the entire document content instead of just a single chunk.',
    {
      documentPath: z.string().describe('Document path from search result metadata (e.g., "grid/api/Grid.md")'),
      version: z.string().describe('Documentation version (use same version from search results)'),
    },
    async ({ documentPath, version }) => {
      logger.info({ tool: 'get_full_document', documentPath, version }, 'Executing MCP tool');

      try {
        if (!documentPath) {
          throw new Error('documentPath is required');
        }
        if (!version) {
          throw new Error('version is required');
        }

        const chunks = await vectorStore.getDocumentChunks(documentPath, version);

        if (!chunks || chunks.length === 0) {
          throw new Error(`Document not found: ${documentPath} (version: ${version})`);
        }

        // Reconstruct full document text
        const fullText = chunks.map(chunk => {
          const heading = chunk.metadata.heading ? `\n\n## ${chunk.metadata.heading}\n\n` : '';
          return heading + chunk.text;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  documentPath,
                  version,
                  totalChunks: chunks.length,
                  metadata: chunks[0]?.metadata || {},
                  fullText,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error: error.message, tool: 'get_full_document' }, 'Tool execution failed');
        throw error;
      }
    }
  );

  // Tool: list_versions
  server.tool(
    'list_versions',
    'List all available documentation versions in the database.',
    {},
    async () => {
      logger.info({ tool: 'list_versions' }, 'Executing MCP tool');

      try {
        const versions = await vectorStore.getAllVersions();
        const latest = await vectorStore.getLatestVersion();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  versions,
                  latest,
                  count: versions.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error: error.message, tool: 'list_versions' }, 'Tool execution failed');
        throw error;
      }
    }
  );

  return server;
}

/**
 * Connect MCP server to Fastify via SSE transport
 * Using start() and handlePostMessage() methods
 */
export async function connectMCPTransport(fastify, queryService, vectorStore) {
  logger.info('Setting up MCP SSE transport');

  // Session map to track transports and their servers
  const sessions = new Map();

  // GET endpoint - establishes SSE connection
  fastify.get('/mcp', async (request, reply) => {
    logger.info({ ip: request.ip, query: request.query }, 'MCP GET - establishing SSE connection');

    try {
      // Hijack the reply to prevent Fastify from sending response
      reply.hijack();

      // Set CORS headers directly on raw response BEFORE transport writes
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      reply.raw.setHeader('Access-Control-Expose-Headers', '*');

      // Create transport with the endpoint for POST messages
      const transport = new SSEServerTransport('/mcp', reply.raw);

      // Create a new server instance for this connection
      const server = createMCPServer(queryService, vectorStore);

      // Connect to MCP server (this calls start() automatically)
      await server.connect(transport);

      // Store session with both transport and server
      sessions.set(transport.sessionId, { transport, server });
      logger.info({ sessionId: transport.sessionId, totalSessions: sessions.size }, 'SSE session established');

      // Cleanup on disconnect
      request.raw.on('close', () => {
        sessions.delete(transport.sessionId);
        logger.info({ sessionId: transport.sessionId }, 'SSE session closed');
      });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'SSE connection error');
      throw error;
    }
  });

  // POST endpoint - receives client messages
  fastify.post('/mcp', async (request, reply) => {
    const sessionId = request.query.sessionId;
    logger.info({ ip: request.ip, sessionId }, 'MCP POST - client message');

    try {
      if (!sessionId) {
        reply.header('Access-Control-Allow-Origin', '*');
        return reply.code(400).send({ error: 'sessionId required' });
      }

      const session = sessions.get(sessionId);
      if (!session) {
        logger.warn({ sessionId, availableSessions: Array.from(sessions.keys()) }, 'Session not found');
        reply.header('Access-Control-Allow-Origin', '*');
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Hijack the reply to prevent Fastify from sending response
      reply.hijack();

      // Set CORS headers directly on raw response BEFORE transport writes
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      reply.raw.setHeader('Access-Control-Expose-Headers', '*');

      // Forward to transport's handlePostMessage
      await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'POST handler error');
      return reply.code(500).send({ error: error.message });
    }
  });

  // Info endpoint
  fastify.get('/mcp/info', async () => {
    return {
      name: 'Bryntum RAG MCP Server',
      version: '1.0.0',
      protocol: 'MCP',
      sdk: '@modelcontextprotocol/sdk',
      transport: 'SSE',
      authentication: 'None (open access)',
      endpoint: '/mcp',
      tools: ['search_docs', 'search_examples', 'get_doc', 'get_full_document', 'list_versions'],
    };
  });
}

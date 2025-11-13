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
 * Create and configure MCP server using high-level API
 */
export function createMCPServer(queryService, vectorStore) {
  const mcpServer = new McpServer(
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
  mcpServer.registerTool(
    'search_docs',
    {
      description: 'Search Bryntum documentation using semantic similarity. Returns relevant documentation chunks.',
      inputSchema: {
        query: z.string().describe('The search query'),
        limit: z.number().min(1).max(50).default(5).describe('Maximum number of results to return (1-50)'),
        version: z.string().optional().describe('Documentation version to search (defaults to latest)'),
        product: z.string().optional().describe('Filter by product (grid, scheduler, gantt, etc.)'),
        framework: z.string().optional().describe('Filter by framework (react, angular, vue, vanilla)'),
      },
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
  mcpServer.registerTool(
    'search_examples',
    {
      description: 'Search specifically for code examples in Bryntum documentation.',
      inputSchema: {
        query: z.string().describe('The search query'),
        limit: z.number().min(1).max(50).default(5).describe('Maximum number of results to return (1-50)'),
        version: z.string().optional().describe('Documentation version to search (defaults to latest)'),
        product: z.string().optional().describe('Filter by product (grid, scheduler, gantt, etc.)'),
        framework: z.string().optional().describe('Filter by framework (react, angular, vue, vanilla)'),
      },
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
  mcpServer.registerTool(
    'get_doc',
    {
      description: 'Get a specific document chunk by ID. Use this to retrieve full content after search.',
      inputSchema: {
        id: z.string().describe('Document chunk ID from search results'),
      },
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

  // Tool: list_versions
  mcpServer.registerTool(
    'list_versions',
    {
      description: 'List all available documentation versions in the database.',
      inputSchema: {},
    },
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

  return mcpServer;
}

/**
 * Connect MCP server to Fastify via SSE transport
 */
export async function connectMCPTransport(fastify, mcpServer) {
  // Session management for SSE transports
  const sessions = new Map();

  // GET endpoint for SSE stream
  fastify.get('/mcp', async (request, reply) => {
    const sessionId = request.query.sessionId;

    // SessionId is REQUIRED - client must generate it and use same ID for POST
    if (!sessionId) {
      logger.warn({ ip: request.ip }, 'GET request missing sessionId');
      return reply.code(400).send({
        error: 'sessionId required',
        message: 'Please provide a sessionId in query string: GET /mcp?sessionId=<uuid>'
      });
    }

    logger.info({ ip: request.ip, sessionId }, 'MCP SSE stream connected');

    try {
      // Set CORS headers explicitly for SSE
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Check if session already exists (reconnection attempt)
      if (sessions.has(sessionId)) {
        logger.warn({ sessionId }, 'Session already exists - cleaning up old session');
        sessions.delete(sessionId);
      }

      const transport = new SSEServerTransport('/mcp', reply.raw);

      // Store transport in session map
      sessions.set(sessionId, transport);
      logger.info({ sessionId, totalSessions: sessions.size }, 'Transport session registered');

      await mcpServer.connect(transport);

      // Handle disconnect - cleanup session
      request.raw.on('close', () => {
        sessions.delete(sessionId);
        logger.info({ sessionId, totalSessions: sessions.size }, 'MCP client disconnected');
      });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'MCP SSE connection error');
      throw error;
    }
  });

  // POST endpoint for client messages
  fastify.post('/mcp', async (request, reply) => {
    const sessionId = request.query.sessionId;
    logger.info({ ip: request.ip, sessionId, hasBody: !!request.body }, 'MCP POST message received');

    try {
      // Set CORS headers
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type');

      if (!sessionId) {
        logger.warn('POST request missing sessionId');
        return reply.code(400).send({ error: 'sessionId required' });
      }

      let transport = sessions.get(sessionId);

      // If session doesn't exist, it means this is a POST-first flow
      // Create a "pending" transport that will be used when GET arrives
      if (!transport) {
        logger.info({ sessionId }, 'POST before GET - storing message for deferred processing');

        // For POST-first flow, we need to return an error and let the client establish GET first
        // This follows the SSE protocol requirement: GET establishes stream, then POST sends messages
        logger.warn({ sessionId, availableSessions: Array.from(sessions.keys()) }, 'Session not found - client must establish SSE connection via GET first');
        return reply.code(400).send({
          error: 'Session not established',
          message: 'Please establish SSE connection via GET /mcp?sessionId=<id> before sending messages'
        });
      }

      // Forward the message to the transport's handlePostMessage method
      // This method processes the JSON-RPC message and routes it to the MCP server
      logger.info({ sessionId, body: request.body }, 'Routing message to transport');

      // The SDK's handlePostMessage expects raw Node HTTP req/res objects
      await transport.handlePostMessage(request.raw, reply.raw);
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'MCP POST handler error');
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
      tools: ['search_docs', 'search_examples', 'get_doc', 'list_versions'],
    };
  });
}

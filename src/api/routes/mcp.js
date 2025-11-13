/**
 * MCP (Model Context Protocol) Routes
 *
 * Implements MCP HTTP transport with JSON-RPC over POST and SSE for streaming.
 * Thin wrapper around existing RAG backend.
 *
 * Endpoints:
 *   POST /mcp       - JSON-RPC endpoint for MCP protocol
 *   GET  /mcp/sse   - SSE endpoint for streaming responses
 *   GET  /mcp       - MCP server info
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'MCP' });

// MCP Tools definitions
const MCP_TOOLS = {
  search_docs: {
    name: 'search_docs',
    description: 'Search Bryntum documentation using semantic similarity. Returns relevant documentation chunks.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (1-50)',
          default: 5,
        },
        version: {
          type: 'string',
          description: 'Documentation version to search (defaults to latest)',
        },
        product: {
          type: 'string',
          description: 'Filter by product (grid, scheduler, gantt, etc.)',
        },
        framework: {
          type: 'string',
          description: 'Filter by framework (react, angular, vue, vanilla)',
        },
      },
      required: ['query'],
    },
  },
  search_examples: {
    name: 'search_examples',
    description: 'Search specifically for code examples in Bryntum documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (1-50)',
          default: 5,
        },
        version: {
          type: 'string',
          description: 'Documentation version to search (defaults to latest)',
        },
        product: {
          type: 'string',
          description: 'Filter by product (grid, scheduler, gantt, etc.)',
        },
        framework: {
          type: 'string',
          description: 'Filter by framework (react, angular, vue, vanilla)',
        },
      },
      required: ['query'],
    },
  },
  get_doc: {
    name: 'get_doc',
    description: 'Get a specific document chunk by ID. Use this to retrieve full content after search.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Document chunk ID from search results',
        },
      },
      required: ['id'],
    },
  },
  list_versions: {
    name: 'list_versions',
    description: 'List all available documentation versions in the database.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
};

// Execute MCP tool
async function executeTool(toolName, args, fastify) {
  logger.info({ tool: toolName, args }, 'Executing MCP tool');

  try {
    switch (toolName) {
      case 'search_docs': {
        const { query, limit = 5, version, product, framework } = args;

        if (!query || typeof query !== 'string') {
          throw new Error('Query is required and must be a string');
        }

        const filter = {};
        if (product) filter.product = product;
        if (framework) filter.framework = framework;

        const results = await fastify.queryService.search(query, {
          limit: Math.min(Math.max(limit, 1), 50),
          filter,
          version,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                version: results[0]?.metadata?.version || version,
                count: results.length,
                results: results.map(r => ({
                  id: r.id,
                  text: r.text,
                  score: r.score,
                  metadata: r.metadata,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'search_examples': {
        const { query, limit = 5, version, product, framework } = args;

        if (!query || typeof query !== 'string') {
          throw new Error('Query is required and must be a string');
        }

        const filter = { type: 'example' };
        if (product) filter.product = product;
        if (framework) filter.framework = framework;

        const results = await fastify.queryService.search(query, {
          limit: Math.min(Math.max(limit, 1), 50),
          filter,
          version,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                version: results[0]?.metadata?.version || version,
                count: results.length,
                results: results.map(r => ({
                  id: r.id,
                  text: r.text,
                  score: r.score,
                  metadata: r.metadata,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_doc': {
        const { id } = args;

        if (!id) {
          throw new Error('Document ID is required');
        }

        const doc = await fastify.vectorStore.getDocument(id);

        if (!doc) {
          throw new Error(`Document not found: ${id}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: doc.id,
                text: doc.text,
                metadata: doc.metadata,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_versions': {
        const versions = await fastify.vectorStore.getAllVersions();
        const latest = await fastify.vectorStore.getLatestVersion();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                versions,
                latest,
                count: versions.length,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    logger.error({ error: error.message, tool: toolName }, 'Tool execution failed');
    throw error;
  }
}

// Handle JSON-RPC request
async function handleJsonRpc(request, fastify) {
  const { jsonrpc, method, params, id } = request.body;

  // Validate JSON-RPC 2.0
  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"',
      },
      id: id || null,
    };
  }

  try {
    switch (method) {
      case 'initialize': {
        logger.info({ params }, 'MCP Initialize');
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'bryntum-rag-mcp',
              version: '1.0.0',
            },
          },
          id,
        };
      }

      case 'tools/list': {
        logger.info('MCP tools/list');
        return {
          jsonrpc: '2.0',
          result: {
            tools: Object.values(MCP_TOOLS),
          },
          id,
        };
      }

      case 'tools/call': {
        const { name: toolName, arguments: args } = params;

        if (!toolName || !MCP_TOOLS[toolName]) {
          return {
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: `Unknown tool: ${toolName}`,
            },
            id,
          };
        }

        const result = await executeTool(toolName, args || {}, fastify);

        return {
          jsonrpc: '2.0',
          result,
          id,
        };
      }

      case 'ping': {
        logger.debug('MCP ping');
        return {
          jsonrpc: '2.0',
          result: {},
          id,
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        };
    }
  } catch (error) {
    logger.error({ error: error.message, method }, 'JSON-RPC handler error');
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message,
      },
      id,
    };
  }
}

export default async function mcpRoutes(fastify) {
  /**
   * POST /mcp - JSON-RPC endpoint
   */
  fastify.post('/', async (request, reply) => {
    const response = await handleJsonRpc(request, fastify);
    return response;
  });

  /**
   * GET /mcp - SSE endpoint for MCP HTTP transport
   *
   * This is the main MCP connection endpoint using Server-Sent Events.
   * Clients connect here and receive streaming responses.
   */
  fastify.get('/', async (request, reply) => {
    logger.info({ ip: request.ip }, 'MCP SSE connection established');

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial endpoint event with server capabilities
    const endpointEvent = {
      jsonrpc: '2.0',
      method: 'endpoint',
      params: {
        endpoint: 'http://localhost:3000/mcp',
      },
    };
    reply.raw.write(`event: endpoint\n`);
    reply.raw.write(`data: ${JSON.stringify(endpointEvent)}\n\n`);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
      try {
        reply.raw.write('event: ping\n');
        reply.raw.write('data: {}\n\n');
      } catch (err) {
        clearInterval(pingInterval);
      }
    }, 15000);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(pingInterval);
      logger.info('MCP SSE connection closed');
    });
  });

  /**
   * GET /mcp/info - MCP server info (non-SSE)
   */
  fastify.get('/info', async () => {
    return {
      name: 'Bryntum RAG MCP Server',
      version: '1.0.0',
      protocol: 'MCP over HTTP',
      transport: 'JSON-RPC 2.0 over POST, SSE for streaming',
      authentication: 'None (open access)',
      endpoints: {
        sse: 'GET /mcp',
        jsonrpc: 'POST /mcp',
        info: 'GET /mcp/info',
      },
      tools: Object.keys(MCP_TOOLS),
    };
  });
}

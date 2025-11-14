/**
 * RAG API Server
 *
 * REST API for document indexing and semantic search.
 *
 * Endpoints:
 *   POST /index        - Index documents from uploaded zip
 *   POST /search       - Search for documents
 *   GET  /doc/:id      - Get document by ID
 */

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { WeaviateAdapter } from '../adapters/vectorstore/WeaviateAdapter.js';
import { QueryService } from '../services/QueryService.js';
import { jobManager } from '../services/JobManager.js';
import indexRoutes from './routes/index.js';
import searchRoutes from './routes/search.js';
import documentRoutes from './routes/document.js';
import versionsRoutes from './routes/versions.js';
import tagsRoutes from './routes/tags.js';
import statsRoutes from './routes/stats.js';
import generateRoutes from './routes/generate.js';
import { createMCPServer, connectMCPTransport } from '../mcp/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildServer() {
  // Validate configuration
  validateConfig();

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
  });

  await fastify.register(websocket);

  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
  });

  // Serve static files from web directory
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '../../web'),
    prefix: '/',
  });

  // Initialize shared services
  const vectorStore = new WeaviateAdapter(
    config.weaviate.host,
    config.weaviate.port,
    config.weaviate.className
  );

  const queryService = new QueryService(vectorStore);

  // Initialize query service
  await queryService.initialize();

  // Decorate fastify with shared services
  fastify.decorate('queryService', queryService);
  fastify.decorate('vectorStore', vectorStore);

  // Register API routes under /api prefix
  fastify.register(indexRoutes, { prefix: '/api/index' });
  fastify.register(searchRoutes, { prefix: '/api/search' });
  fastify.register(documentRoutes, { prefix: '/api/doc' });
  fastify.register(versionsRoutes, { prefix: '/api/versions' });
  fastify.register(tagsRoutes, { prefix: '/api/tags' });
  fastify.register(statsRoutes, { prefix: '/api/stats' });
  fastify.register(generateRoutes, { prefix: '/api' });

  // Connect MCP server transport
  try {
    logger.info('Connecting MCP transport...');
    await connectMCPTransport(fastify, queryService, vectorStore);
    logger.info('MCP transport connected successfully');
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to initialize MCP server');
    throw error;
  }

  // Health check
  fastify.get('/api/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  // API info route
  fastify.get('/api', async () => {
    return {
      name: 'Bryntum RAG API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/health',
        index: 'POST /api/index',
        search: 'POST /api/search',
        query: 'POST /api/search (alias)',
        getDocument: 'GET /api/doc/:id',
        jobs: 'WS /api/jobs (WebSocket for job progress)',
        mcp: 'GET /mcp (MCP server info)',
        mcpJsonRpc: 'POST /mcp (MCP JSON-RPC endpoint)',
        mcpSSE: 'GET /mcp/sse (MCP SSE streaming)',
      },
    };
  });

  // WebSocket endpoint for job progress
  fastify.get('/api/jobs', { websocket: true }, (connection, req) => {
    logger.info('WebSocket client connected');

    // Send current active jobs immediately
    connection.send(JSON.stringify({
      type: 'init',
      jobs: jobManager.getActiveJobs(),
      allJobs: jobManager.getAllJobs(),
    }));

    // Listen for progress events
    const onProgress = (job) => {
      if (connection.readyState === 1) {
        connection.send(JSON.stringify({
          type: 'progress',
          job,
        }));
      }
    };

    jobManager.on('progress', onProgress);

    // Handle client messages
    connection.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.jobId) {
          // Subscribe to specific job
          const job = jobManager.getJob(data.jobId);
          if (job) {
            connection.send(JSON.stringify({
              type: 'job',
              job,
            }));
          }
        } else if (data.type === 'list') {
          // List all jobs
          connection.send(JSON.stringify({
            type: 'list',
            jobs: jobManager.getAllJobs(),
            active: jobManager.getActiveJobs(),
          }));
        }
      } catch (error) {
        logger.error({ error: error.message }, 'WebSocket message error');
      }
    });

    // Cleanup on disconnect
    connection.on('close', () => {
      jobManager.off('progress', onProgress);
      logger.info('WebSocket client disconnected');
    });
  });

  // SPA fallback - serve index.html for all non-API routes
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'API endpoint not found' });
    } else {
      reply.sendFile('index.html');
    }
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(
      { port: config.server.port, host: config.server.host },
      'Server started successfully'
    );

    console.log(`\n🚀 RAG API Server running at http://${config.server.host}:${config.server.port}`);
    console.log(`📚 API Documentation: http://${config.server.host}:${config.server.port}/`);

  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

start();

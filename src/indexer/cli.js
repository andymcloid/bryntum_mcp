#!/usr/bin/env node

/**
 * Document Indexer CLI
 *
 * Command-line tool to index documents from filesystem or zip into vector database.
 *
 * Usage:
 *   node src/indexer/cli.js --source ./docs
 *   node src/indexer/cli.js --zip ./docs.zip
 *   node src/indexer/cli.js --source ./docs --clear
 */

import { parseArgs } from 'node:util';
import { config, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { WeaviateAdapter } from '../adapters/vectorstore/WeaviateAdapter.js';
import { FileSystemSource } from '../adapters/sources/FileSystemSource.js';
import { ZipSource } from '../adapters/sources/ZipSource.js';
import { DocumentProcessor } from '../services/DocumentProcessor.js';
import { IndexService } from '../services/IndexService.js';

async function main() {
  try {
    // Parse command-line arguments
    const { values } = parseArgs({
      options: {
        source: { type: 'string', short: 's' },
        zip: { type: 'string', short: 'z' },
        version: { type: 'string', short: 'v' },
        clear: { type: 'boolean', default: false },
        'batch-size': { type: 'string', default: '50' },
        help: { type: 'boolean', short: 'h' },
      },
    });

    if (values.help) {
      printHelp();
      return;
    }

    // Validate configuration
    validateConfig();

    // Validate arguments
    if (!values.source && !values.zip) {
      logger.error('Either --source or --zip must be specified');
      printHelp();
      process.exit(1);
    }

    if (!values.version) {
      logger.error('--version is required');
      printHelp();
      process.exit(1);
    }

    logger.info('Starting document indexer');
    logger.info({ config: { ...config, openai: { ...config.openai, apiKey: '***' } } });

    // Create document source
    let documentSource;
    if (values.zip) {
      logger.info({ zipPath: values.zip }, 'Using zip source');
      documentSource = new ZipSource(values.zip);
    } else {
      logger.info({ sourcePath: values.source }, 'Using filesystem source');
      documentSource = new FileSystemSource(values.source);
    }

    // Get document count
    const docCount = await documentSource.getDocumentCount();
    logger.info({ documentCount: docCount }, 'Found documents');

    // Create adapters
    const vectorStore = new WeaviateAdapter(
      config.weaviate.host,
      config.weaviate.port,
      config.weaviate.className
    );

    // Create services
    const documentProcessor = new DocumentProcessor();
    const indexService = new IndexService(
      documentSource,
      documentProcessor,
      vectorStore
    );

    // Run indexing
    const startTime = Date.now();
    const result = await indexService.indexDocuments({
      version: values.version,
      batchSize: parseInt(values['batch-size']),
      clearExisting: values.clear,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info({
      ...result,
      duration: `${duration}s`,
    }, 'Indexing completed');

    console.log('\n✅ Indexing completed successfully!');
    console.log(`📄 Documents processed: ${result.documentsProcessed}`);
    console.log(`📦 Chunks indexed: ${result.chunksIndexed}`);
    console.log(`⏱️  Duration: ${duration}s`);

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Indexing failed');
    console.error('\n❌ Indexing failed:', error.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Document Indexer CLI

Usage:
  npm run index -- [options]

Options:
  -s, --source <path>       Path to directory containing markdown files
  -z, --zip <path>          Path to zip file containing markdown files
  -v, --version <version>   Documentation version (required, e.g., "6.3.3")
  --clear                   Clear existing documents before indexing
  --batch-size <size>       Batch size for processing (default: 50)
  -h, --help                Show this help message

Examples:
  npm run index -- --source ./temp/docs-llm --version 6.3.3
  npm run index -- --zip docs.zip --version 6.3.3
  npm run index -- --zip ./docs-llm.zip
  npm run index -- --source ./docs --clear --batch-size 100

Environment Variables:
  OPENAI_API_KEY           OpenAI API key (required)
  OPENAI_EMBEDDING_MODEL   Embedding model (default: text-embedding-3-small)
  VECTOR_DB_PATH           LanceDB storage path (default: ./data/lancedb)
  CHUNK_SIZE               Chunk size in characters (default: 1000)
  CHUNK_OVERLAP            Chunk overlap in characters (default: 200)
`);
}

main();

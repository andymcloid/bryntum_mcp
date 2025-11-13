/**
 * Configuration Management
 *
 * Centralized configuration loading and validation.
 * Follows Single Responsibility Principle (SRP).
 */
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: join(__dirname, '../../.env') });

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // Weaviate Configuration
  weaviate: {
    host: process.env.WEAVIATE_HOST || '192.168.10.100',
    port: parseInt(process.env.WEAVIATE_PORT) || 1900,
    className: process.env.WEAVIATE_CLASS_NAME || 'Document',
  },

  // Storage Configuration
  storage: {
    tempUploadPath: process.env.TEMP_UPLOAD_PATH || './temp',
  },

  // Chunking Configuration
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

/**
 * Validate required configuration
 * @throws {Error} If required configuration is missing
 */
export function validateConfig() {
  const required = [
    { key: 'openai.apiKey', value: config.openai.apiKey, name: 'OPENAI_API_KEY' },
  ];

  for (const { key, value, name } of required) {
    if (!value) {
      throw new Error(`Missing required configuration: ${name}`);
    }
  }
}

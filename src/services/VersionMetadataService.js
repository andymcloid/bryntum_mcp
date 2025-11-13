/**
 * Version Metadata Service
 *
 * Manages framework-specific metadata per version (install commands, URLs, etc.)
 * Stores metadata in JSON files: data/metadata/{version}.json
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ component: 'VersionMetadataService' });

export class VersionMetadataService {
  constructor(metadataPath = './data/metadata') {
    this.metadataPath = metadataPath;
  }

  /**
   * Get metadata file path for version
   */
  getMetadataFilePath(version) {
    return join(this.metadataPath, `${version}.json`);
  }

  /**
   * Initialize metadata directory
   */
  async initialize() {
    try {
      await mkdir(this.metadataPath, { recursive: true });
      logger.info({ metadataPath: this.metadataPath }, 'Metadata directory initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize metadata directory');
      throw error;
    }
  }

  /**
   * Get metadata for a version
   */
  async getMetadata(version) {
    try {
      const filePath = this.getMetadataFilePath(version);

      if (!existsSync(filePath)) {
        logger.debug({ version }, 'No metadata found for version');
        return null;
      }

      const data = await readFile(filePath, 'utf-8');
      const metadata = JSON.parse(data);

      logger.debug({ version }, 'Metadata retrieved');
      return metadata;
    } catch (error) {
      logger.error({ error: error.message, version }, 'Failed to get metadata');
      throw error;
    }
  }

  /**
   * Save metadata for a version
   */
  async saveMetadata(version, metadata) {
    try {
      await this.initialize(); // Ensure directory exists

      const filePath = this.getMetadataFilePath(version);

      const metadataWithTimestamp = {
        ...metadata,
        version,
        updatedAt: new Date().toISOString(),
      };

      await writeFile(filePath, JSON.stringify(metadataWithTimestamp, null, 2), 'utf-8');

      logger.info({ version }, 'Metadata saved');
      return metadataWithTimestamp;
    } catch (error) {
      logger.error({ error: error.message, version }, 'Failed to save metadata');
      throw error;
    }
  }

  /**
   * Update metadata for a version (merge with existing)
   */
  async updateMetadata(version, updates) {
    try {
      const existing = await this.getMetadata(version) || {};

      const merged = {
        ...existing,
        ...updates,
        manuallyUpdated: true,
      };

      return await this.saveMetadata(version, merged);
    } catch (error) {
      logger.error({ error: error.message, version }, 'Failed to update metadata');
      throw error;
    }
  }

  /**
   * Extract install commands from indexed documents
   */
  async extractInstallCommands(documents) {
    const installCommands = {};
    const npmPattern = /npm install @bryntum\/([a-z]+)@npm:@bryntum\/\1-trial@[\d.]+/gi;
    const yarnPattern = /yarn add @bryntum\/([a-z]+)@npm:@bryntum\/\1-trial@[\d.]+/gi;

    for (const doc of documents) {
      const content = doc.text || '';

      // Find npm install commands
      let match;
      while ((match = npmPattern.exec(content)) !== null) {
        const product = match[1];
        if (!installCommands[product]) {
          installCommands[product] = {
            npm: match[0],
          };
        }
      }

      // Find yarn add commands
      npmPattern.lastIndex = 0; // Reset regex
      while ((match = yarnPattern.exec(content)) !== null) {
        const product = match[1];
        if (installCommands[product]) {
          installCommands[product].yarn = match[0];
        }
      }
    }

    logger.debug({ installCommands }, 'Extracted install commands from documents');

    return Object.keys(installCommands).length > 0 ? installCommands : null;
  }

  /**
   * Auto-generate metadata from indexed documents
   */
  async generateMetadata(version, vectorStore) {
    try {
      logger.info({ version }, 'Generating metadata from indexed documents');

      // Get all documents for this version
      const results = await vectorStore.search([0, 0, 0], 1000, { version });

      if (!results || results.length === 0) {
        logger.warn({ version }, 'No documents found for version');
        return null;
      }

      // Extract install commands
      const installCommands = await this.extractInstallCommands(results);

      // Check if metadata already exists
      const existing = await this.getMetadata(version);

      if (existing && existing.manuallyUpdated) {
        logger.info({ version }, 'Metadata already exists and was manually updated, skipping auto-generation');
        return existing;
      }

      const metadata = {
        installCommands: installCommands || {},
        extractedAt: new Date().toISOString(),
        manuallyUpdated: false,
        documentCount: results.length,
      };

      return await this.saveMetadata(version, metadata);
    } catch (error) {
      logger.error({ error: error.message, version }, 'Failed to generate metadata');
      return null;
    }
  }
}

// Export singleton instance
export const versionMetadataService = new VersionMetadataService();

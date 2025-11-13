/**
 * Zip Document Source Adapter
 *
 * Reads markdown files from a zip archive.
 * Follows Single Responsibility Principle (SRP) and Liskov Substitution Principle (LSP).
 */
import AdmZip from 'adm-zip';
import { extname } from 'path';
import { DocumentSource } from '../../core/DocumentSource.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'ZipSource' });

export class ZipSource extends DocumentSource {
  constructor(zipPath, options = {}) {
    super();
    this.zipPath = zipPath;
    this.extensions = options.extensions || ['.md', '.markdown'];
    this.encoding = options.encoding || 'utf-8';
    this.zip = null;
  }

  async *readDocuments() {
    logger.info({ zipPath: this.zipPath }, 'Reading documents from zip');

    try {
      this.zip = new AdmZip(this.zipPath);
      const entries = this.zip.getEntries();

      const mdEntries = entries.filter(entry => {
        if (entry.isDirectory) return false;
        const ext = extname(entry.entryName).toLowerCase();
        return this.extensions.includes(ext);
      });

      logger.info({ count: mdEntries.length }, 'Found markdown files in zip');

      for (const entry of mdEntries) {
        try {
          const content = entry.getData().toString(this.encoding);

          yield {
            path: entry.entryName,
            content,
            metadata: {
              source: 'zip',
              zipPath: this.zipPath,
              entryName: entry.entryName,
              extension: extname(entry.entryName),
              size: entry.header.size,
            },
          };

          logger.debug({ path: entry.entryName }, 'Read document from zip');
        } catch (error) {
          logger.error(
            { error: error.message, path: entry.entryName },
            'Failed to read zip entry'
          );
        }
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to read zip file');
      throw new Error(`Failed to read zip file: ${error.message}`);
    }
  }

  async getDocumentCount() {
    try {
      this.zip = new AdmZip(this.zipPath);
      const entries = this.zip.getEntries();

      return entries.filter(entry => {
        if (entry.isDirectory) return false;
        const ext = extname(entry.entryName).toLowerCase();
        return this.extensions.includes(ext);
      }).length;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to count documents');
      return 0;
    }
  }

  async cleanup() {
    this.zip = null;
  }
}

/**
 * FileSystem Document Source Adapter
 *
 * Reads markdown files from a directory recursively.
 * Follows Single Responsibility Principle (SRP) and Liskov Substitution Principle (LSP).
 */
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { DocumentSource } from '../../core/DocumentSource.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ component: 'FileSystemSource' });

export class FileSystemSource extends DocumentSource {
  constructor(rootPath, options = {}) {
    super();
    this.rootPath = rootPath;
    this.extensions = options.extensions || ['.md', '.markdown'];
    this.encoding = options.encoding || 'utf-8';
  }

  async *readDocuments() {
    logger.info({ rootPath: this.rootPath }, 'Reading documents from filesystem');

    const files = await this._findFiles(this.rootPath);
    logger.info({ count: files.length }, 'Found files');

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, this.encoding);
        const relativePath = relative(this.rootPath, filePath);

        yield {
          path: relativePath,
          content,
          metadata: {
            source: 'filesystem',
            fullPath: filePath,
            relativePath,
            extension: extname(filePath),
          },
        };

        logger.debug({ path: relativePath }, 'Read document');
      } catch (error) {
        logger.error({ error: error.message, path: filePath }, 'Failed to read file');
      }
    }
  }

  async getDocumentCount() {
    const files = await this._findFiles(this.rootPath);
    return files.length;
  }

  /**
   * Recursively find all files with matching extensions
   * @private
   */
  async _findFiles(dir) {
    const files = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this._findFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (this.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error({ error: error.message, dir }, 'Failed to read directory');
    }

    return files;
  }
}

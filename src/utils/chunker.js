/**
 * Text Chunking Utility
 *
 * Splits text into overlapping chunks for better embedding quality.
 * Follows Single Responsibility Principle (SRP).
 */

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Maximum chunk size in characters
 * @param {number} overlap - Overlap size in characters
 * @returns {string[]} Array of text chunks
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || text.length === 0) {
    return [];
  }

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at a sentence boundary if possible
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > chunkSize / 2) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunks.push(chunk.trim());

    // Move start position with overlap
    start = end - overlap;

    // Prevent infinite loop
    if (start + chunkSize >= text.length && start < text.length) {
      if (chunks[chunks.length - 1] !== text.slice(start).trim()) {
        chunks.push(text.slice(start).trim());
      }
      break;
    }
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Split text by markdown headers for better semantic chunking
 * @param {string} text - Markdown text
 * @param {number} maxChunkSize - Maximum size per chunk
 * @returns {Array<{heading: string, content: string}>}
 */
export function chunkByMarkdownHeaders(text, maxChunkSize = 8000) {
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = { heading: '', content: '' };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous chunk if it has content
      if (currentChunk.content.trim()) {
        chunks.push({ ...currentChunk });
      }

      // Start new chunk
      currentChunk = {
        heading: headerMatch[2].trim(),
        content: line + '\n',
      };
    } else {
      currentChunk.content += line + '\n';
    }

    // If chunk is too large, split it
    if (currentChunk.content.length > maxChunkSize) {
      const textChunks = chunkText(currentChunk.content, maxChunkSize);
      textChunks.forEach((textChunk, index) => {
        chunks.push({
          heading: currentChunk.heading + (index > 0 ? ` (part ${index + 1})` : ''),
          content: textChunk,
        });
      });
      currentChunk = { heading: '', content: '' };
    }
  }

  // Add final chunk
  if (currentChunk.content.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}

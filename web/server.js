/**
 * Simple Static File Server for Development
 *
 * Serves the vanilla JS SPA on port 8080.
 */
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.WEB_PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  // Log request
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  let filePath = req.url === '/' ? '/index.html' : req.url;

  // For SPA routing, serve index.html for non-file requests
  if (!extname(filePath)) {
    filePath = '/index.html';
  }

  const fullPath = join(__dirname, filePath);
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(fullPath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, serve index.html for SPA routing
      try {
        const indexPath = join(__dirname, 'index.html');
        const indexContent = await readFile(indexPath);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      } catch {
        res.writeHead(404);
        res.end('404 Not Found');
      }
    } else {
      res.writeHead(500);
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n🌐 Web Server running at http://localhost:${PORT}`);
  console.log(`📝 API Server at http://localhost:3000`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

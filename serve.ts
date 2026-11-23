// Marisol Heat — tiny static server for local playtest (Node stdlib only).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const port = parseInt(process.env.PORT || '18080', 10);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.css': 'text/css',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/game/index.html';
    const file = join(root, p);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404); res.end('not found');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('Marisol Heat playtest server on http://127.0.0.1:' + port + '/');
});

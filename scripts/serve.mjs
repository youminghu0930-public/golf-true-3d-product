// A local static server with byte-range support for browser video seeking.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const built = process.argv.includes('--dist');
const root = path.resolve(fileURLToPath(new URL(built ? '../dist/' : '../', import.meta.url)));
if (built && !fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Run node scripts/build-site.mjs before previewing dist/.');
  process.exit(1);
}
const port = Number(process.argv.slice(2).find(argument => /^\d+$/.test(argument)) || 8009);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let filename;
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname);
    filename = path.resolve(root, `.${relative.endsWith('/') ? `${relative}index.html` : relative}`);
    if (!filename.startsWith(`${root}${path.sep}`) && filename !== path.join(root, 'index.html')) throw new Error('Invalid path');
    if (path.relative(root, filename).split(path.sep).some(part => part.startsWith('.'))) throw new Error('Hidden path');
    if (!fs.statSync(filename).isFile()) throw new Error('Not a file');
  } catch { response.writeHead(404).end(); return; }
  const size = fs.statSync(filename).size;
  const headers = { 'Content-Type': types[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': path.extname(filename)==='.json'?'no-store':'no-cache' };
  let start = 0, end = size - 1;
  if (request.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start > end || start >= size) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = Math.max(0, end - start + 1);
  response.writeHead(request.headers.range ? 206 : 200, headers);
  if (request.method === 'HEAD' || !size) { response.end(); return; }
  const stream = fs.createReadStream(filename, { start, end });
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));

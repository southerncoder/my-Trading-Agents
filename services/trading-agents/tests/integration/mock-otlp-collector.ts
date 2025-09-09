import http from 'http';

export function startMockOtlpCollector(port = 4318) {
  let lastPayload: any = null;

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url && req.url.includes('/v1/logs')) {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => { chunks.push(Buffer.from(chunk)); });
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        // Try JSON first
        if (contentType.includes('application/json') || contentType.includes('json')) {
          try {
            lastPayload = JSON.parse(buf.toString('utf8'));
          } catch (_e) {
            lastPayload = { raw: buf.toString('utf8') };
          }
        } else {
          // Fallback: try to decode as utf8 JSON
          try {
            lastPayload = JSON.parse(buf.toString('utf8'));
          } catch (_e) {
            lastPayload = { raw: buf.toString('base64') };
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return new Promise<{port:number, close:()=>Promise<void>, getLastPayload:()=>any}>(resolve => {
    server.listen(port, () => {
      resolve({ port, close: () => new Promise((r) => server.close(() => r())), getLastPayload: () => lastPayload });
    });
  });
}

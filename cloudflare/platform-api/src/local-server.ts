import { serve } from '@hono/node-server';
import app from './index';

const port = parseInt(process.argv[2] || '8787', 10);

console.log(`🚀 Starting local Node.js server on http://localhost:${port}`);

async function startServer() {
  await serve({
    fetch: app.fetch,
    port: port,
  }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

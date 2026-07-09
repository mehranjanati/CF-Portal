import { Hono } from 'hono';
import type { AppEnv } from '../../types/env';
import { BuilderService } from './service';

const router = new Hono<AppEnv>();

// Create a new builder session
router.post('/sessions', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const body = await c.req.json();
  
  if (!body.tenantId || !body.appId || !body.template || !body.intent) {
    return c.json({ error: 'Missing required session fields' }, 400);
  }
  
  try {
    const data = await service.createSession(body.tenantId, body.appId, body.template, body.intent);
    return c.json({ data });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get session details
router.get('/sessions/:sessionId', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const sessionId = c.req.param('sessionId');
  
  try {
    const data = await service.getSession(sessionId);
    return c.json({ data });
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// Stream updates for a session via SSE
router.get('/sessions/:sessionId/stream', async (c) => {
  const db = c.env.DB;
  const sessionId = c.req.param('sessionId');
  const service = new BuilderService(db, c.env.AI);

  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('Access-Control-Allow-Origin', '*');

  // In a real implementation, we would use a Pub/Sub mechanism (like Cloudflare Durable Objects)
  // to push updates to this stream. For now, we'll implement a simple polling-based stream.
  // This is a placeholder for the real streaming logic.

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[BuilderStream] Session ${sessionId} stream started`);
      
      // Polling interval for mock streaming
      const interval = setInterval(async () => {
        try {
          // In a real implementation, the worker would push updates to a DO
          // which would then push to this stream.
          // For now, we just send a heartbeat to show the connection is alive.
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        } catch (e) {
          console.error('[BuilderStream] Error in stream interval:', e);
          clearInterval(interval);
          controller.error(e as Error);
        }
      }, 5000);

      // Handle client disconnect
      // Note: In Workers, the stream might be closed when the connection is lost.
      // We should monitor the response to detect this.
    },
    cancel() {
      console.log(`[BuilderStream] Session ${sessionId} stream closed by client`);
    }
  });

  return c.body(stream);
});

// Generate code for a session
router.post('/sessions/:sessionId/generate', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();
  
  if (!body.prompt) {
    return c.json({ error: 'Missing prompt' }, 400);
  }
  
  try {
    const result = await service.generate(sessionId, body.prompt);
    return c.json({ data: result });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get history for an app
router.get('/apps/:appId/history', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const appId = c.req.param('appId');
  
  const history = await service.getHistoryByApp(appId);
  return c.json({ data: { items: history } });
});

// Apply generation result to project (draft intent)
router.post('/sessions/:sessionId/apply', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const sessionId = c.req.param('sessionId');
  
  const result = await service.applyResult(sessionId);
  return c.json({ data: result });
});

// Publish project to Cloudflare (draft intent)
router.post('/apps/:appId/publish', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI);
  const appId = c.req.param('appId');
  
  const result = await service.publishApp(appId);
  return c.json({ data: result });
});

export default router;

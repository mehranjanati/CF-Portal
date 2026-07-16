import { Hono } from 'hono';
import type { AppEnv } from '../../types/env';
import { BuilderService } from './service';
import { StateConflictError } from '../../lib/errors';

const router = new Hono<AppEnv>();

// Create a new builder session
router.post('/sessions', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
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
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
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
  const sessionId = c.req.param('sessionId');
  const id = c.env.STREAMER.idFromName(sessionId);
  const streamer = c.env.STREAMER.get(id);
  
  return streamer.fetch(c.req.raw);
});


// Generate code for a session
router.post('/sessions/:sessionId/generate', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
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
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
  const appId = c.req.param('appId');
  
  const history = await service.getHistoryByApp(appId);
  return c.json({ data: { items: history } });
});

// Apply generation result to project (draft intent)
router.post('/sessions/:sessionId/apply', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
  const sessionId = c.req.param('sessionId');
  
  try {
    const result = await service.applyResult(sessionId);
    return c.json({ data: result });
  } catch (e: any) {
    console.error(`[BuilderRoutes] apply failed: ${e.message}`);
    return c.json({ error: e.message || 'Failed to apply result' }, 400);
  }
});

// Publish project to Cloudflare (draft intent)
router.post('/apps/:appId/publish', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
  const appId = c.req.param('appId');
  
  const result = await service.publishApp(appId);
  return c.json({ data: result });
});

// Update session state from client
router.post('/sessions/:sessionId/state', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db, c.env.AI, c.env.STREAMER, c.env);
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();

  try {
    const result = await service.updateSessionState(
      sessionId, 
      body.state, 
      body.versionVector, 
      body.clientId, 
      body.strategy,
      body.expectedVersion
    );
    return c.json({ data: result });
  } catch (e: any) {
    if (e instanceof StateConflictError) {
      return c.json({ conflict: e.conflict }, 409);
    }
    return c.json({ error: e.message }, 500);
  }
});

export default router;

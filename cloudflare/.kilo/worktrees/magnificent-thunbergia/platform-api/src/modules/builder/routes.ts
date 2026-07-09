import { Hono } from 'hono';
import type { AppEnv } from '../../types/env';
import { BuilderService } from './service';

const router = new Hono<AppEnv>();

// Create a new builder session
router.post('/sessions', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const body = await c.req.json();
  
  const { tenantId, appId, template, intent } = body;
  
  if (!tenantId || !appId || !template || !intent) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const session = await service.createSession(tenantId, appId, template, intent);
  return c.json(session, 201);
});

// Get a session by ID
router.get('/sessions/:sessionId', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const sessionId = c.req.param('sessionId');
  
  try {
    const data = await service.getSession(sessionId);
    return c.json(data);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// Generate code for a session
router.post('/sessions/:sessionId/generate', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();
  
  if (!body.prompt) {
    return c.json({ error: 'Missing prompt' }, 400);
  }

  try {
    const result = await service.generate(sessionId, body.prompt);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get history for an app
router.get('/apps/:appId/history', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const appId = c.req.param('appId');
  
  const history = await service.getHistoryByApp(appId);
  return c.json({ items: history });
});

// Apply generation result to project (draft intent)
router.post('/sessions/:sessionId/apply', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const sessionId = c.req.param('sessionId');
  
  const result = await service.applyResult(sessionId);
  return c.json(result);
});

// Publish project to Cloudflare (draft intent)
router.post('/apps/:appId/publish', async (c) => {
  const db = c.env.DB;
  const service = new BuilderService(db);
  const appId = c.req.param('appId');
  
  const result = await service.publishApp(appId);
  return c.json(result);
});

export default router;

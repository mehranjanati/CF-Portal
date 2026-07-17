import { Hono } from 'hono';
import { SimpleCoderAgent } from '../../agents/SimpleCoderAgent';
import { SimpleMemory } from '../../agents/memory';
import type { AppBindings } from '../../types/env';

const app = new Hono<{ Bindings: AppBindings }>();

// POST /api/agent/chat - Send message to agent
app.post('/chat', async (c) => {
  try {
    const { message, sessionId } = await c.req.json();

    if (!message || !sessionId) {
      return c.json({ error: 'message and sessionId required' }, 400);
    }

    const agent = new SimpleCoderAgent(c.env);
    const memory = new SimpleMemory(c.env.MEMORY);

    // Add user message to memory
    await memory.addMessage(sessionId, {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Execute agent
    const result = await agent.execute(message);

    // Add assistant response to memory
    if (result.success && result.output) {
      await memory.addMessage(sessionId, {
        role: 'assistant',
        content: result.output,
        timestamp: Date.now(),
      });
    }

    return c.json({
      success: result.success,
      output: result.output,
      previewUrl: result.previewUrl,
      error: result.error,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /api/agent/history - Get conversation history
app.get('/history', async (c) => {
  try {
    const sessionId = c.req.query('sessionId');

    if (!sessionId) {
      return c.json({ error: 'sessionId required' }, 400);
    }

    const memory = new SimpleMemory(c.env.MEMORY);
    const messages = await memory.getMessages(sessionId);

    return c.json({ messages });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// DELETE /api/agent/history - Clear conversation history
app.delete('/history', async (c) => {
  try {
    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: 'sessionId required' }, 400);
    }

    const memory = new SimpleMemory(c.env.MEMORY);
    await memory.clear(sessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
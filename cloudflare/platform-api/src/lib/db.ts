import type { Context } from 'hono';

import type { AppBindings } from '../types/env';

export function getDb(c: Context<{ Bindings: AppBindings }>): D1Database {
  return c.env.DB;
}

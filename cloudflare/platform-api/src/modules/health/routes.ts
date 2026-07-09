import { Hono } from 'hono';

import { ok } from '../../lib/json';
import type { AppBindings } from '../../types/env';

const healthRoutes = new Hono<{ Bindings: AppBindings }>();

healthRoutes.get('/', (c) => {
  return ok(c, {
    status: 'ok',
    service: 'platform-api',
    layer: 'control-plane',
  });
});

export default healthRoutes;

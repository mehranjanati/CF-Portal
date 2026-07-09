import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { AppCreatePayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import { createApp, listApps } from './queries';

const appRoutes = new Hono<{ Bindings: AppBindings }>();

appRoutes.get('/', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');
    const apps = await listApps(getDb(c), tenantId);

    return ok(c, apps, {
      count: apps.length,
      resource: 'apps',
      ...(tenantId ? { tenantId } : {}),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

appRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as AppCreatePayload;

    if (!payload.tenantId || !payload.name) {
      return failure(c, 400, 'Missing required fields for app creation');
    }

    if (!payload.id) {
      payload.id = `app_${crypto.randomUUID().split('-')[0]}`;
    }

    const app = await createApp(getDb(c), payload);
    return ok(c, app, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default appRoutes;

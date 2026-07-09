import { Hono } from 'hono';
import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { AppBindings } from '../../types/env';
import { getWorkspaceBootstrap } from './service';

const portalRoutes = new Hono<{ Bindings: AppBindings }>();

portalRoutes.get('/workspace/:tenantId/bootstrap', async (c) => {
  try {
    const tenantId = c.req.param('tenantId');
    const data = await getWorkspaceBootstrap(getDb(c), tenantId);

    if (!data) {
      return failure(c, 404, 'Workspace not found');
    }

    return ok(c, data);
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default portalRoutes;

import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { GitHubIntegrationCreatePayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import {
  createGitHubIntegration,
  deleteGitHubIntegration,
  listGitHubIntegrations,
} from './queries';

const githubIntegrationRoutes = new Hono<{ Bindings: AppBindings }>();

githubIntegrationRoutes.get('/', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');
    const integrations = await listGitHubIntegrations(getDb(c), tenantId);

    return ok(c, integrations, {
      count: integrations.length,
      provider: 'github',
      ...(tenantId ? { tenantId } : {}),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

githubIntegrationRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as GitHubIntegrationCreatePayload;

    if (!payload.id || !payload.tenantId || !payload.providerAccountId || !payload.accessTokenEncrypted) {
      return failure(c, 400, 'Missing required fields for GitHub integration');
    }

    const integration = await createGitHubIntegration(getDb(c), payload);
    return ok(c, integration, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

githubIntegrationRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteGitHubIntegration(getDb(c), id);
    return ok(c, { deleted: true, id });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default githubIntegrationRoutes;

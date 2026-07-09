import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { CloudflareAccountCreatePayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import {
  createCloudflareAccount,
  deleteCloudflareAccount,
  listCloudflareAccounts,
} from './queries';

const cloudflareIntegrationRoutes = new Hono<{ Bindings: AppBindings }>();

cloudflareIntegrationRoutes.get('/', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');
    const accounts = await listCloudflareAccounts(getDb(c), tenantId);

    return ok(c, accounts, {
      count: accounts.length,
      provider: 'cloudflare',
      ...(tenantId ? { tenantId } : {}),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

cloudflareIntegrationRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as CloudflareAccountCreatePayload;

    if (!payload.id || !payload.tenantId || !payload.cfAccountId || !payload.apiTokenEncrypted) {
      return failure(c, 400, 'Missing required fields for Cloudflare account');
    }

    const account = await createCloudflareAccount(getDb(c), payload);
    return ok(c, account, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

cloudflareIntegrationRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteCloudflareAccount(getDb(c), id);
    return ok(c, { deleted: true, id });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default cloudflareIntegrationRoutes;

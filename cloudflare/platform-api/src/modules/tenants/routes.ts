import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { TenantCreatePayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import { createTenant, listTenants } from './queries';

const tenantRoutes = new Hono<{ Bindings: AppBindings }>();

tenantRoutes.get('/', async (c) => {
  try {
    const tenants = await listTenants(getDb(c));
    return ok(c, tenants, { count: tenants.length });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

tenantRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as TenantCreatePayload;

    if (!payload.name || !payload.slug) {
      return failure(c, 400, 'Missing required fields for tenant creation');
    }
    
    if (!payload.id) {
      payload.id = `tenant_${crypto.randomUUID().split('-')[0]}`;
    }

    const tenant = await createTenant(getDb(c), payload);
    return ok(c, tenant, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default tenantRoutes;

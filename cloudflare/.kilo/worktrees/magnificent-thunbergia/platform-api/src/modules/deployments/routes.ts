import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type {
  DeploymentCallbackPayload,
  DeploymentCreatePayload,
} from '../../types/api';
import type { AppBindings } from '../../types/env';
import {
  createDeployment,
  listDeploymentRuns,
  listDeploymentSummaries,
  upsertDeploymentRun,
} from './queries';

const deploymentRoutes = new Hono<{ Bindings: AppBindings }>();

deploymentRoutes.get('/', async (c) => {
  try {
    const appId = c.req.query('appId');
    const tenantId = c.req.query('tenantId');
    const deployments = await listDeploymentSummaries(getDb(c), {
      appId,
      tenantId,
    });

    return ok(c, deployments, { count: deployments.length });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

deploymentRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as DeploymentCreatePayload;

    if (!payload.id || !payload.appId || !payload.environment) {
      return failure(c, 400, 'Missing required fields for deployment creation');
    }

    const deployment = await createDeployment(getDb(c), payload);
    return ok(c, deployment, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

deploymentRoutes.get('/:deploymentId/runs', async (c) => {
  try {
    const deploymentId = c.req.param('deploymentId');
    const runs = await listDeploymentRuns(getDb(c), deploymentId);

    return ok(c, runs, {
      count: runs.length,
      deploymentId,
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

deploymentRoutes.post('/callback', async (c) => {
  try {
    const payload = (await c.req.json()) as DeploymentCallbackPayload;

    if (
      !payload.deploymentId ||
      !payload.runId ||
      !payload.commitSha ||
      !payload.branch ||
      !payload.status
    ) {
      return failure(
        c,
        400,
        'Deployment callback payload is incomplete.',
        {
          required: ['deploymentId', 'runId', 'commitSha', 'branch', 'status'],
        },
      );
    }

    const run = await upsertDeploymentRun(getDb(c), payload);
    return ok(c, run, { updated: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default deploymentRoutes;

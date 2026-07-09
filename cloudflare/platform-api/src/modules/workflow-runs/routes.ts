import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { WorkflowRunUpsertPayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import { listWorkflowRuns, upsertWorkflowRun } from './queries';

const workflowRunRoutes = new Hono<{ Bindings: AppBindings }>();

workflowRunRoutes.get('/', async (c) => {
  try {
    const appId = c.req.query('appId');
    const tenantId = c.req.query('tenantId');
    const status = c.req.query('status');
    const runs = await listWorkflowRuns(getDb(c), {
      appId,
      tenantId,
      status,
    });

    return ok(c, runs, { count: runs.length });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

workflowRunRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as WorkflowRunUpsertPayload;

    if (
      !payload.id ||
      !payload.appId ||
      !payload.tenantId ||
      !payload.workflowKind ||
      !payload.status
    ) {
      return failure(c, 400, 'Workflow run payload is incomplete.', {
        required: ['id', 'appId', 'tenantId', 'workflowKind', 'status'],
      });
    }

    const run = await upsertWorkflowRun(getDb(c), payload);
    return ok(c, run, { updated: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default workflowRunRoutes;

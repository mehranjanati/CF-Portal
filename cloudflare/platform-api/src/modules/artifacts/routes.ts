import { Hono } from 'hono';

import { getDb } from '../../lib/db';
import { handleRouteError } from '../../lib/errors';
import { failure, ok } from '../../lib/json';
import type { ArtifactCreatePayload } from '../../types/api';
import type { AppBindings } from '../../types/env';
import { createArtifact, listArtifacts } from './queries';

const artifactRoutes = new Hono<{ Bindings: AppBindings }>();

artifactRoutes.get('/', async (c) => {
  try {
    const appId = c.req.query('appId');
    const workflowRunId = c.req.query('workflowRunId');
    const deploymentId = c.req.query('deploymentId');
    const artifacts = await listArtifacts(getDb(c), {
      appId,
      workflowRunId,
      deploymentId,
    });

    return ok(c, artifacts, { count: artifacts.length });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

artifactRoutes.post('/', async (c) => {
  try {
    const payload = (await c.req.json()) as ArtifactCreatePayload;

    if (!payload.id || !payload.appId || !payload.kind || !payload.filePath || !payload.storageRef) {
      return failure(c, 400, 'Artifact payload is incomplete.', {
        required: ['id', 'appId', 'kind', 'filePath', 'storageRef'],
      });
    }

    const artifact = await createArtifact(getDb(c), payload);
    return ok(c, artifact, { created: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default artifactRoutes;

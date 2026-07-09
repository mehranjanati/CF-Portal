import type {
  DeploymentCallbackPayload,
  DeploymentCreatePayload,
  DeploymentRecord,
  DeploymentRunRecord,
} from '../../types/api';

export async function listDeploymentSummaries(
  db: D1Database,
  filters?: {
    appId?: string | null;
    tenantId?: string | null;
  },
): Promise<DeploymentRecord[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.appId) {
    conditions.push('d.app_id = ?');
    params.push(filters.appId);
  }

  if (filters?.tenantId) {
    conditions.push('a.tenant_id = ?');
    params.push(filters.tenantId);
  }

  const sql = `
    SELECT
      d.id,
      d.app_id,
      a.name AS app_name,
      a.tenant_id,
      d.environment,
      d.url,
      d.current_run_id,
      dr.status AS current_run_status,
      dr.commit_sha AS current_run_commit_sha,
      d.created_at,
      d.updated_at
    FROM deployments d
    INNER JOIN apps a ON a.id = d.app_id
    LEFT JOIN deployment_runs dr ON dr.id = d.current_run_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY d.updated_at DESC, d.created_at DESC
  `;

  const statement = db.prepare(sql);
  const executed = params.length ? statement.bind(...params) : statement;
  const { results } = await executed.all();

  return (results ?? []) as DeploymentRecord[];
}

export async function createDeployment(
  db: D1Database,
  payload: DeploymentCreatePayload,
): Promise<DeploymentRecord> {
  await db
    .prepare(
      'INSERT INTO deployments (id, app_id, environment, url) VALUES (?, ?, ?, ?)',
    )
    .bind(payload.id, payload.appId, payload.environment, payload.url ?? null)
    .run();

  const results = await listDeploymentSummaries(db, { appId: payload.appId });
  const result = results.find((r) => r.id === payload.id);

  if (!result) throw new Error('Failed to create deployment');
  return result;
}

export async function listDeploymentRuns(
  db: D1Database,
  deploymentId: string,
): Promise<DeploymentRunRecord[]> {
  const { results } = await db
    .prepare(
      `
        SELECT
          id,
          deployment_id,
          commit_sha,
          branch,
          status,
          logs_url,
          error_message,
          started_at,
          completed_at
        FROM deployment_runs
        WHERE deployment_id = ?
        ORDER BY started_at DESC
      `,
    )
    .bind(deploymentId)
    .all();

  return (results ?? []) as DeploymentRunRecord[];
}

export async function upsertDeploymentRun(
  db: D1Database,
  payload: DeploymentCallbackPayload,
) {
  await db
    .prepare(
      `
        INSERT INTO deployment_runs (
          id,
          deployment_id,
          commit_sha,
          branch,
          status,
          logs_url,
          error_message,
          completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          commit_sha = excluded.commit_sha,
          branch = excluded.branch,
          status = excluded.status,
          logs_url = excluded.logs_url,
          error_message = excluded.error_message,
          completed_at = excluded.completed_at
      `,
    )
    .bind(
      payload.runId,
      payload.deploymentId,
      payload.commitSha,
      payload.branch,
      payload.status,
      payload.logsUrl ?? null,
      payload.errorMessage ?? null,
      payload.completedAt ?? null,
    )
    .run();

  await db
    .prepare(
      `
        UPDATE deployments
        SET current_run_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(payload.runId, payload.deploymentId)
    .run();

  const { results } = await db
    .prepare(
      `
        SELECT
          id,
          deployment_id,
          commit_sha,
          branch,
          status,
          logs_url,
          error_message,
          started_at,
          completed_at
        FROM deployment_runs
        WHERE id = ?
      `,
    )
    .bind(payload.runId)
    .all();

  return (results?.[0] ?? null) as DeploymentRunRecord | null;
}

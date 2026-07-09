import type { ArtifactCreatePayload, ArtifactRecord } from '../../types/api';

export async function listArtifacts(
  db: D1Database,
  filters?: {
    appId?: string | null;
    workflowRunId?: string | null;
    deploymentId?: string | null;
  },
): Promise<ArtifactRecord[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.appId) {
    conditions.push('ar.app_id = ?');
    params.push(filters.appId);
  }

  if (filters?.workflowRunId) {
    conditions.push('ar.workflow_run_id = ?');
    params.push(filters.workflowRunId);
  }

  if (filters?.deploymentId) {
    conditions.push('ar.deployment_id = ?');
    params.push(filters.deploymentId);
  }

  const sql = `
    SELECT
      ar.id,
      ar.app_id,
      a.name AS app_name,
      ar.workflow_run_id,
      ar.deployment_id,
      ar.kind,
      ar.file_path,
      ar.storage_provider,
      ar.storage_ref,
      ar.content_hash,
      ar.size_bytes,
      ar.created_at
    FROM artifacts ar
    INNER JOIN apps a ON a.id = ar.app_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY ar.created_at DESC
  `;

  const statement = db.prepare(sql);
  const executed = params.length ? statement.bind(...params) : statement;
  const { results } = await executed.all();

  return (results ?? []) as ArtifactRecord[];
}

export async function createArtifact(
  db: D1Database,
  payload: ArtifactCreatePayload,
) {
  await db
    .prepare(
      `
        INSERT INTO artifacts (
          id,
          app_id,
          workflow_run_id,
          deployment_id,
          kind,
          file_path,
          storage_provider,
          storage_ref,
          content_hash,
          size_bytes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      payload.id,
      payload.appId,
      payload.workflowRunId ?? null,
      payload.deploymentId ?? null,
      payload.kind,
      payload.filePath,
      payload.storageProvider ?? 'r2',
      payload.storageRef,
      payload.contentHash ?? null,
      payload.sizeBytes ?? null,
    )
    .run();

  const { results } = await db
    .prepare(
      `
        SELECT
          ar.id,
          ar.app_id,
          a.name AS app_name,
          ar.workflow_run_id,
          ar.deployment_id,
          ar.kind,
          ar.file_path,
          ar.storage_provider,
          ar.storage_ref,
          ar.content_hash,
          ar.size_bytes,
          ar.created_at
        FROM artifacts ar
        INNER JOIN apps a ON a.id = ar.app_id
        WHERE ar.id = ?
      `,
    )
    .bind(payload.id)
    .all();

  return (results?.[0] ?? null) as ArtifactRecord | null;
}

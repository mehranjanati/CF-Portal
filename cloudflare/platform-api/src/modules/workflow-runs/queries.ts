import type {
  WorkflowRunRecord,
  WorkflowRunUpsertPayload,
} from '../../types/api';

export async function listWorkflowRuns(
  db: D1Database,
  filters?: {
    appId?: string | null;
    tenantId?: string | null;
    status?: string | null;
  },
): Promise<WorkflowRunRecord[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.appId) {
    conditions.push('wr.app_id = ?');
    params.push(filters.appId);
  }

  if (filters?.tenantId) {
    conditions.push('wr.tenant_id = ?');
    params.push(filters.tenantId);
  }

  if (filters?.status) {
    conditions.push('wr.status = ?');
    params.push(filters.status);
  }

  const sql = `
    SELECT
      wr.id,
      wr.app_id,
      a.name AS app_name,
      wr.tenant_id,
      wr.workflow_kind,
      wr.trigger_source,
      wr.status,
      wr.current_step,
      wr.input_snapshot_ref,
      wr.started_at,
      wr.completed_at,
      wr.created_at,
      wr.updated_at
    FROM workflow_runs wr
    INNER JOIN apps a ON a.id = wr.app_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY wr.updated_at DESC, wr.created_at DESC
  `;

  const statement = db.prepare(sql);
  const executed = params.length ? statement.bind(...params) : statement;
  const { results } = await executed.all();

  return (results ?? []) as WorkflowRunRecord[];
}

export async function upsertWorkflowRun(
  db: D1Database,
  payload: WorkflowRunUpsertPayload,
) {
  await db
    .prepare(
      `
        INSERT INTO workflow_runs (
          id,
          app_id,
          tenant_id,
          workflow_kind,
          trigger_source,
          status,
          current_step,
          input_snapshot_ref,
          completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          app_id = excluded.app_id,
          tenant_id = excluded.tenant_id,
          workflow_kind = excluded.workflow_kind,
          trigger_source = excluded.trigger_source,
          status = excluded.status,
          current_step = excluded.current_step,
          input_snapshot_ref = excluded.input_snapshot_ref,
          completed_at = excluded.completed_at,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .bind(
      payload.id,
      payload.appId,
      payload.tenantId,
      payload.workflowKind,
      payload.triggerSource ?? 'system',
      payload.status,
      payload.currentStep ?? null,
      payload.inputSnapshotRef ?? null,
      payload.completedAt ?? null,
    )
    .run();

  const { results } = await db
    .prepare(
      `
        SELECT
          wr.id,
          wr.app_id,
          a.name AS app_name,
          wr.tenant_id,
          wr.workflow_kind,
          wr.trigger_source,
          wr.status,
          wr.current_step,
          wr.input_snapshot_ref,
          wr.started_at,
          wr.completed_at,
          wr.created_at,
          wr.updated_at
        FROM workflow_runs wr
        INNER JOIN apps a ON a.id = wr.app_id
        WHERE wr.id = ?
      `,
    )
    .bind(payload.id)
    .all();

  return (results?.[0] ?? null) as WorkflowRunRecord | null;
}

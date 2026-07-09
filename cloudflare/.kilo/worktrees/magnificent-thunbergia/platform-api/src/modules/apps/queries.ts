import type { AppCreatePayload, AppRecord } from '../../types/api';

export async function listApps(
  db: D1Database,
  tenantId?: string | null,
): Promise<AppRecord[]> {
  const baseSql = [
    'SELECT id, tenant_id, name, description, status, created_at, updated_at',
    'FROM apps',
  ];

  if (tenantId) {
    const { results } = await db
      .prepare(`${baseSql.join(' ')} WHERE tenant_id = ? ORDER BY created_at DESC`)
      .bind(tenantId)
      .all();

    return (results ?? []) as AppRecord[];
  }

  const { results } = await db
    .prepare(`${baseSql.join(' ')} ORDER BY created_at DESC`)
    .all();

  return (results ?? []) as AppRecord[];
}

export async function createApp(
  db: D1Database,
  payload: AppCreatePayload,
): Promise<AppRecord> {
  await db
    .prepare(
      'INSERT INTO apps (id, tenant_id, name, description, status) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(
      payload.id,
      payload.tenantId,
      payload.name,
      payload.description ?? null,
      payload.status ?? 'draft',
    )
    .run();

  const result = await db
    .prepare(
      'SELECT id, tenant_id, name, description, status, created_at, updated_at FROM apps WHERE id = ?',
    )
    .bind(payload.id)
    .first<AppRecord>();

  if (!result) throw new Error('Failed to create app');
  return result;
}

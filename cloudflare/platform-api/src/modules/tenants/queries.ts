import type { TenantCreatePayload, TenantRecord } from '../../types/api';

export async function listTenants(db: D1Database): Promise<TenantRecord[]> {
  const { results } = await db
    .prepare('SELECT id, name, slug, created_at FROM tenants ORDER BY created_at DESC')
    .all();

  return (results ?? []) as TenantRecord[];
}

export async function createTenant(
  db: D1Database,
  payload: TenantCreatePayload,
): Promise<TenantRecord> {
  await db
    .prepare('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)')
    .bind(payload.id, payload.name, payload.slug)
    .run();

  const result = await db
    .prepare('SELECT id, name, slug, created_at FROM tenants WHERE id = ?')
    .bind(payload.id)
    .first<TenantRecord>();

  if (!result) throw new Error('Failed to create tenant');
  return result;
}

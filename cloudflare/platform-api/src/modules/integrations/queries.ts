import { encrypt } from '../../lib/crypto';
import type {
  CloudflareAccountCreatePayload,
  CloudflareAccountRecord,
  GitHubIntegrationCreatePayload,
  GitHubIntegrationRecord,
} from '../../types/api';

export async function listGitHubIntegrations(
  db: D1Database,
  tenantId?: string | null,
): Promise<GitHubIntegrationRecord[]> {
  const baseSql = `
    SELECT
      id,
      tenant_id,
      provider,
      provider_account_id,
      provider_account_name,
      expires_at,
      created_at
    FROM integration_connections
    WHERE provider = 'github'
  `;

  if (tenantId) {
    const { results } = await db
      .prepare(`${baseSql} AND tenant_id = ? ORDER BY created_at DESC`)
      .bind(tenantId)
      .all();

    return (results ?? []) as GitHubIntegrationRecord[];
  }

  const { results } = await db
    .prepare(`${baseSql} ORDER BY created_at DESC`)
    .all();

  return (results ?? []) as GitHubIntegrationRecord[];
}

export async function createGitHubIntegration(
  db: D1Database,
  payload: GitHubIntegrationCreatePayload,
): Promise<GitHubIntegrationRecord> {
  await db
    .prepare(
      `
      INSERT INTO integration_connections (
        id, tenant_id, provider, provider_account_id, provider_account_name,
        access_token_encrypted, refresh_token_encrypted, expires_at
      ) VALUES (?, ?, 'github', ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      payload.id,
      payload.tenantId,
      payload.providerAccountId,
      payload.providerAccountName,
      encrypt(payload.accessTokenEncrypted),
      payload.refreshTokenEncrypted ? encrypt(payload.refreshTokenEncrypted) : null,
      payload.expiresAt ?? null,
    )
    .run();

  const result = await db
    .prepare('SELECT id, tenant_id, provider, provider_account_id, provider_account_name, expires_at, created_at FROM integration_connections WHERE id = ?')
    .bind(payload.id)
    .first<GitHubIntegrationRecord>();

  if (!result) throw new Error('Failed to create GitHub integration');
  return result;
}

export async function deleteGitHubIntegration(
  db: D1Database,
  id: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM integration_connections WHERE id = ? AND provider = \'github\'')
    .bind(id)
    .run();
}

export async function listCloudflareAccounts(
  db: D1Database,
  tenantId?: string | null,
): Promise<CloudflareAccountRecord[]> {
  const baseSql = `
    SELECT
      id,
      tenant_id,
      cf_account_id,
      cf_account_name,
      status,
      created_at
    FROM cloudflare_accounts
  `;

  if (tenantId) {
    const { results } = await db
      .prepare(`${baseSql} WHERE tenant_id = ? ORDER BY created_at DESC`)
      .bind(tenantId)
      .all();

    return (results ?? []) as CloudflareAccountRecord[];
  }

  const { results } = await db
    .prepare(`${baseSql} ORDER BY created_at DESC`)
    .all();

  return (results ?? []) as CloudflareAccountRecord[];
}

export async function createCloudflareAccount(
  db: D1Database,
  payload: CloudflareAccountCreatePayload,
): Promise<CloudflareAccountRecord> {
  await db
    .prepare(
      `
      INSERT INTO cloudflare_accounts (
        id, tenant_id, cf_account_id, cf_account_name, api_token_encrypted
      ) VALUES (?, ?, ?, ?, ?)
    `,
    )
    .bind(
      payload.id,
      payload.tenantId,
      payload.cfAccountId,
      payload.cfAccountName ?? null,
      encrypt(payload.apiTokenEncrypted),
    )
    .run();

  const result = await db
    .prepare('SELECT id, tenant_id, cf_account_id, cf_account_name, status, created_at FROM cloudflare_accounts WHERE id = ?')
    .bind(payload.id)
    .first<CloudflareAccountRecord>();

  if (!result) throw new Error('Failed to create Cloudflare account');
  return result;
}

export async function deleteCloudflareAccount(
  db: D1Database,
  id: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM cloudflare_accounts WHERE id = ?')
    .bind(id)
    .run();
}

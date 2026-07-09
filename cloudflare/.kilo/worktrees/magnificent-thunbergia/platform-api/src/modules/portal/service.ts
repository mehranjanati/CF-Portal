import { listApps } from '../apps/queries';
import { listDeploymentSummaries } from '../deployments/queries';
import { listCloudflareAccounts, listGitHubIntegrations } from '../integrations/queries';

export async function getWorkspaceBootstrap(db: D1Database, tenantId: string) {
  const [tenant, apps, github, cloudflare, deployments] = await Promise.all([
    db.prepare('SELECT id, name, slug, created_at FROM tenants WHERE id = ?').bind(tenantId).first(),
    listApps(db, tenantId),
    listGitHubIntegrations(db, tenantId),
    listCloudflareAccounts(db, tenantId),
    listDeploymentSummaries(db, { tenantId }),
  ]);

  if (!tenant) return null;

  return {
    tenant,
    apps,
    deployments,
    integrations: {
      github,
      cloudflare,
    },
  };
}

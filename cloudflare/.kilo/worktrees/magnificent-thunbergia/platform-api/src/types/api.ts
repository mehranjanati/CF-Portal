export type ApiMeta = Record<string, unknown>;

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  success: false;
  error: string;
  details?: unknown;
};

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type TenantCreatePayload = {
  id: string;
  name: string;
  slug: string;
};

export type AppRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AppCreatePayload = {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  status?: string;
};

export type DeploymentRecord = {
  id: string;
  app_id: string;
  app_name: string;
  tenant_id: string;
  environment: string;
  url: string | null;
  current_run_id: string | null;
  current_run_status: string | null;
  current_run_commit_sha: string | null;
  created_at: string;
  updated_at: string;
};

export type DeploymentCreatePayload = {
  id: string;
  appId: string;
  environment: string;
  url?: string | null;
};

export type DeploymentRunRecord = {
  id: string;
  deployment_id: string;
  commit_sha: string;
  branch: string;
  status: string;
  logs_url: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export type DeploymentCallbackPayload = {
  deploymentId: string;
  runId: string;
  commitSha: string;
  branch: string;
  status: string;
  logsUrl?: string | null;
  errorMessage?: string | null;
  completedAt?: string | null;
};

export type GitHubIntegrationRecord = {
  id: string;
  tenant_id: string;
  provider: string;
  provider_account_id: string;
  provider_account_name: string;
  expires_at: string | null;
  created_at: string;
};

export type GitHubIntegrationCreatePayload = {
  id: string;
  tenantId: string;
  providerAccountId: string;
  providerAccountName: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  expiresAt?: string | null;
};

export type CloudflareAccountRecord = {
  id: string;
  tenant_id: string;
  cf_account_id: string;
  cf_account_name: string | null;
  status: string;
  created_at: string;
};

export type CloudflareAccountCreatePayload = {
  id: string;
  tenantId: string;
  cfAccountId: string;
  cfAccountName?: string | null;
  apiTokenEncrypted: string;
};

export type WorkflowRunRecord = {
  id: string;
  app_id: string;
  app_name: string;
  tenant_id: string;
  workflow_kind: string;
  trigger_source: string;
  status: string;
  current_step: string | null;
  input_snapshot_ref: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowRunUpsertPayload = {
  id: string;
  appId: string;
  tenantId: string;
  workflowKind: string;
  status: string;
  triggerSource?: string | null;
  currentStep?: string | null;
  inputSnapshotRef?: string | null;
  completedAt?: string | null;
};

export type ArtifactRecord = {
  id: string;
  app_id: string;
  app_name: string;
  workflow_run_id: string | null;
  deployment_id: string | null;
  kind: string;
  file_path: string;
  storage_provider: string;
  storage_ref: string;
  content_hash: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ArtifactCreatePayload = {
  id: string;
  appId: string;
  workflowRunId?: string | null;
  deploymentId?: string | null;
  kind: string;
  filePath: string;
  storageProvider?: string | null;
  storageRef: string;
  contentHash?: string | null;
  sizeBytes?: number | null;
};

export type BuilderValidateRequest = {
  graph?: Record<string, unknown>;
  nodes?: unknown[];
};

export type BuilderValidationResult = {
  valid: boolean;
  issues: string[];
};

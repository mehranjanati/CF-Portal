export type BuilderTemplate = 'landing-page' | 'dashboard' | 'blog' | 'api' | 'empty';

export type BuilderSessionStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'failed';

export interface BuilderSession {
  id: string;
  tenantId: string;
  appId: string;
  template: BuilderTemplate;
  intent: string;
  status: BuilderSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderFilePlanAction {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
}

export interface BuilderResult {
  summary: string;
  files: BuilderFilePlanAction[];
  nextActions: string[];
}

export interface BuilderHistoryItem {
  session: BuilderSession;
  result?: BuilderResult;
}

export interface CreateBuilderSessionRequest {
  tenantId: string;
  appId: string;
  template: BuilderTemplate;
  intent: string;
}

export interface GenerateBuilderRequest {
  prompt: string;
}

export interface GenerateBuilderResponse {
  session: {
    id: string;
    status: BuilderSessionStatus;
  };
  result: BuilderResult;
}

export type AGUIMessage = {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
};

export type AGUIToolCall = {
  type: 'tool_call';
  tool_name: string;
  args: Record<string, any>;
  call_id: string;
};

export type AGUIStateUpdate = {
  type: 'state_update';
  payload: Record<string, any>;
};

export type AGUIPacket = AGUIMessage | AGUIToolCall | AGUIStateUpdate;

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

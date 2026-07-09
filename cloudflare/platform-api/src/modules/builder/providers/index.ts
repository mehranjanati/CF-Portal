export interface ProviderGenerateResult {
  summary: string;
  files: {
    path: string;
    action: 'create' | 'update' | 'delete';
    content?: string;
  }[];
  nextActions: string[];
}

export interface ProviderAdapter {
  name: string;
  generate(prompt: string, context?: any): Promise<ProviderGenerateResult>;
}

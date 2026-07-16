export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ProviderGenerateResult {
  type: 'final' | 'tool_calls';
  summary?: string;
  files?: {
    path: string;
    action: 'create' | 'update' | 'delete';
    content?: string;
  }[];
  nextActions?: string[];
  tool_calls?: ToolCall[];
}

export interface ProviderEvent {
  type: 'tool_call' | 'tool_result' | 'thought' | 'status_change' | 'generation_result' | 'error';
  data: any;
}

export interface ProviderAdapter {
  name: string;
  generate(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult>;
}

// Declare require for TypeScript compatibility in Cloudflare Workers environment
declare const require: (module: string) => any;

// --- Provider Factory ---

export type ProviderType = 'ai-gateway' | 'cloudflare-ai' | 'mock';

export interface ProviderConfig {
  type: ProviderType;
  gatewayUrl?: string;
  gatewayToken?: string;
  primaryModel?: string;
  fallbackModel?: string;
  aiBinding?: any;
}

export function createProvider(config: ProviderConfig): ProviderAdapter {
  switch (config.type) {
    case 'ai-gateway':
      if (!config.gatewayUrl || !config.gatewayToken) {
        console.warn('[ProviderFactory] AI Gateway configured but missing credentials. Falling back to Cloudflare AI.');
        return createCFAIProvider(config.aiBinding);
      }
      // AIGatewayProvider not yet implemented, fall back to Cloudflare AI
      console.warn('[ProviderFactory] AIGatewayProvider not yet implemented, falling back to Cloudflare AI.');
      return createCFAIProvider(config.aiBinding);
    
    case 'cloudflare-ai':
      return createCFAIProvider(config.aiBinding);
    
    case 'mock':
    default:
      return new MockProvider();
  }
}

function createCFAIProvider(aiBinding?: any): ProviderAdapter {
  // Use dynamic import to avoid circular dependency
  // This is compatible with Cloudflare Workers ES modules
  if (aiBinding) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('./cfai') as { CFAIProvider: new (ai: any) => ProviderAdapter };
    return new module.CFAIProvider(aiBinding);
  }
  // Fallback to mock if no AI binding
  return new MockProvider();
}

// --- Mock Provider for Testing ---
export class MockProvider implements ProviderAdapter {
  name = 'mock';
  
  async generate(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult> {
    console.log('[MockProvider] Generating mock response');
    
    if (onEvent) {
      await onEvent({ type: 'thought', data: 'Mock provider simulating response...' });
    }
    
    return {
      type: 'final',
      summary: 'Mock generated response (no real AI connected)',
      files: [
        {
          path: 'src/routes/+page.svelte',
          action: 'create',
          content: '<script>\n  let name = "world";\n</script>\n\n<h1>Hello {name}!</h1>'
        }
      ],
      nextActions: ['Configure AI Gateway for real LLM responses']
    };
  }
}

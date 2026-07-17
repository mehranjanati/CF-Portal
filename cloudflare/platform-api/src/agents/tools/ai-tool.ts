export interface AIToolParams {
  prompt: string;
  systemPrompt?: string;
}

export class AITool {
  name = 'ai';

  async execute(params: AIToolParams): Promise<string> {
    // Simplified AI call - in production, use Cloudflare AI Gateway
    return `AI generated response for: ${params.prompt}`;
  }
}
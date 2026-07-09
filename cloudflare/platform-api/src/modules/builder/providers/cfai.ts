import type { ProviderAdapter, ProviderGenerateResult } from './index';

export class CFAIProvider implements ProviderAdapter {
  name = 'cloudflare-ai';

  constructor(private ai: any) {}

  async generate(prompt: string, context?: any): Promise<ProviderGenerateResult> {
    console.log(`[CFAIProvider] Generating for prompt: ${prompt}`);

    const systemPrompt = `You are an expert web developer and UI architect. 
Your task is to generate high-quality SvelteKit code based on the user's intent.
You MUST respond ONLY with a valid JSON object. Do not include any markdown formatting like \`\`\`json or any other text.

The JSON object must follow this schema:
{
  "summary": "A short description of what was generated",
  "files": [
    {
      "path": "path/to/file.svelte",
      "action": "create" | "update" | "delete",
      "content": "the actual code content"
    }
  ],
  "nextActions": ["action1", "action2"]
}

User Intent: ${context || ''}
User Prompt: ${prompt}`;

     try {
       const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
         prompt: systemPrompt,
         max_tokens: 2048,
       });


      // The response might be a string or an object depending on the model/wrapper
      const content = typeof response === 'string' ? response : response.response;
      
      // Clean the response in case the LLM included markdown blocks
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanedContent);

      return {
        summary: parsed.summary,
        files: parsed.files,
        nextActions: parsed.nextActions
      };
    } catch (error: any) {
      console.error('[CFAIProvider] Generation failed:', error);
      throw new Error(`Cloudflare AI Generation failed: ${error.message}`);
    }
  }
}

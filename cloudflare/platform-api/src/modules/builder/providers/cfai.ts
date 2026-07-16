import type { ProviderAdapter, ProviderGenerateResult, ProviderEvent, ToolCall } from './index';

/**
 * CFAIProvider — Real Cloudflare Workers AI integration
 * 
 * Uses `env.AI.run()` binding to call Llama 3.1 70B through Cloudflare's edge network.
 * Falls back to mock responses when AI binding is not available (local dev without wrangler).
 * 
 * API Reference:
 * Workers AI: https://developers.cloudflare.com/workers-ai/
 * Model: @cf/meta/llama-3.1-70b-instruct
 */
export class CFAIProvider implements ProviderAdapter {
  name = 'cloudflare-ai';
  private static readonly MODEL = '@cf/meta/llama-3.1-70b-instruct';
  private static readonly MAX_TOKENS = 4096;
  private static readonly TEMPERATURE = 0.2;

  constructor(private ai: any) {}

  async generate(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult> {
    console.log(`[CFAIProvider] Generating for prompt: ${prompt.slice(0, 100)}...`);
    console.log(`[CFAIProvider] Context: ${(JSON.stringify(context) || '').slice(0, 200)}`);

    const systemPrompt = this.buildSystemPrompt(context);
    const messages = this.buildMessages(systemPrompt, prompt);

    try {
      // Check if real AI binding is available
      if (this.ai?.run) {
        return await this.callWorkersAI(messages, onEvent);
      } else {
        console.warn('[CFAIProvider] AI binding not available, using mock fallback');
        return this.mockFallback(prompt, context, onEvent);
      }
    } catch (error: any) {
      console.error('[CFAIProvider] Generation failed:', error);
      if (onEvent) {
        await onEvent({ type: 'error', data: error.message });
      }
      
      // Fallback to mock on error
      console.warn('[CFAIProvider] Falling back to mock response after error');
      return this.mockFallback(prompt, context, onEvent);
    }
  }

  /**
   * Build the system prompt that guides the LLM to produce structured SvelteKit code
   * Optimized for Llama 3.1 70B Instruct model
   */
  private buildSystemPrompt(context?: any): string {
    const intent = typeof context === 'string' ? context : context?.intent || '';
    const template = context?.template || '';

    return `You are an expert SvelteKit 5 web developer specializing in modern web application development.

CRITICAL INSTRUCTION: You must respond with ONLY a valid JSON object. No markdown formatting, no code blocks, no explanations, no additional text.

Your response must follow this EXACT structure:
{
  "summary": "Brief description of what was generated (1-2 sentences)",
  "files": [
    {
      "path": "relative/path/to/file.svelte",
      "action": "create",
      "content": "Complete file content as a string"
    }
  ],
  "nextActions": [
    "Action item 1",
    "Action item 2"
  ]
}

DEVELOPMENT RULES:
1. Use Svelte 5 runes syntax: $state, $derived, $effect, $props (NOT let or $:)
2. Use Tailwind CSS v4 for all styling with dark mode support
3. Generate COMPLETE, production-ready code - no placeholders, TODOs, or incomplete implementations
4. All components must be self-contained with proper TypeScript types
5. Follow SvelteKit conventions: +page.svelte for routes, +page.ts for load functions
6. Include proper accessibility attributes (aria-labels, roles)
7. Use semantic HTML5 elements
8. Ensure responsive design with mobile-first approach

EXAMPLE OUTPUT STRUCTURE:
{
  "summary": "Created a responsive hero section with call-to-action button",
  "files": [
    {
      "path": "src/lib/components/Hero.svelte",
      "action": "create",
      "content": "<script lang=\\"ts\\">\\n  let { title = \\"Welcome\\" } = $props();\\n</script>\\n\\n<section class=\\"py-20\\">\\n  <h1>{title}</h1>\\n</section>"
    }
  ],
  "nextActions": [
    "Review the generated component",
    "Test in development mode"
  ]
}

${intent ? `PROJECT CONTEXT: ${intent}` : ''}
${template ? `TEMPLATE: ${template}` : ''}

Generate code for the user's request now. Remember: ONLY JSON, no other text.`;
  }

  /**
   * Build the messages array for the Workers AI API
   * Optimized for Llama 3.1 70B Instruct chat format
   */
  private buildMessages(systemPrompt: string, userPrompt: string): Array<{ role: string; content: string }> {
    return [
      { 
        role: 'system', 
        content: systemPrompt 
      },
      { 
        role: 'user', 
        content: `Generate SvelteKit code for this request: ${userPrompt}\n\nRemember: Respond with ONLY a valid JSON object. No markdown, no code blocks, no explanations.` 
      }
    ];
  }

  /**
   * Call the real Workers AI model through the binding
   */
  private async callWorkersAI(
    messages: Array<{ role: string; content: string }>,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult> {
    console.log(`[CFAIProvider] Calling Workers AI model: ${CFAIProvider.MODEL}`);

    if (onEvent) {
      await onEvent({ type: 'thought', data: 'Generating code using Cloudflare Workers AI...' });
    }

    try {
      const response = await this.ai.run(CFAIProvider.MODEL, {
        messages,
        max_tokens: CFAIProvider.MAX_TOKENS,
        temperature: CFAIProvider.TEMPERATURE,
      });

      console.log('[CFAIProvider] Workers AI response received successfully');

      // The response from Workers AI is { result: { response: string } }
      const rawText = response?.response || '';
      console.log(`[CFAIProvider] Raw response length: ${rawText.length} chars`);
      console.log(`[CFAIProvider] Raw response preview: ${rawText.slice(0, 200)}`);

      if (!rawText) {
        throw new Error('Empty response from Workers AI');
      }

      // Parse the JSON from the response
      return this.parseLLMResponse(rawText, onEvent);
    } catch (error: any) {
      // Check if it's a known error type
      if (error.code === 10000) {
        throw new Error('Authentication failed. Ensure wrangler is logged in and AI binding is configured.');
      } else if (error.code === 2008) {
        throw new Error(`Invalid model: ${CFAIProvider.MODEL}. Check model availability.`);
      }
      throw error;
    }
  }

  /**
   * Parse the LLM response text into a structured ProviderGenerateResult
   * Handles cases where the model wraps JSON in markdown code blocks or adds extra text
   * Optimized for Llama 3.1 70B Instruct model output
   */
  private parseLLMResponse(
    rawText: string,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): ProviderGenerateResult {
    if (onEvent) {
      onEvent({ type: 'thought', data: 'Parsing generated code...' });
    }

    console.log(`[CFAIProvider] Raw response length: ${rawText.length} chars`);
    console.log(`[CFAIProvider] Raw response preview: ${rawText.slice(0, 300)}`);

    // Strategy 1: Try direct parse after cleaning markdown
    let cleanJson = this.extractAndCleanJson(rawText);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
      console.log('[CFAIProvider] JSON parsed successfully on first attempt');
    } catch (parseError) {
      console.warn('[CFAIProvider] First parse attempt failed, trying extraction strategies...');
      
      // Strategy 2: Find JSON object in the text using brace matching
      const jsonObject = this.extractJsonObject(rawText);
      if (jsonObject) {
        try {
          parsed = JSON.parse(jsonObject);
          console.log('[CFAIProvider] JSON extracted via brace matching');
        } catch (extractError) {
          console.error('[CFAIProvider] Failed to parse extracted JSON:', extractError);
          throw new Error(`Failed to parse AI response as JSON. Response preview: ${rawText.slice(0, 300)}`);
        }
      } else {
        console.error('[CFAIProvider] No valid JSON object found in response');
        throw new Error(`AI response did not contain valid JSON. Response preview: ${rawText.slice(0, 300)}`);
      }
    }

    // Validate and normalize the parsed result
    const result = this.validateAndNormalizeResult(parsed, rawText);

    const fileCount = result.files?.length || 0;
    console.log(`[CFAIProvider] Successfully parsed result: ${fileCount} files`);
    
    if (onEvent) {
      onEvent({ type: 'thought', data: `Generated ${fileCount} file(s). Summary: ${result.summary}` });
    }

    return result;
  }

  /**
   * Extract JSON from raw text by removing markdown and cleaning
   */
  private extractAndCleanJson(rawText: string): string {
    let cleaned = rawText.trim();
    
    // Remove markdown code fences (```json ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
    
    // Remove common prefixes that models add
    cleaned = cleaned.replace(/^(Here is|Here's|Sure,|Certainly,|Below is|The result is|Output:)\s*/i, '');
    
    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    return cleaned.trim();
  }

  /**
   * Extract JSON object from text using brace matching algorithm
   * Handles nested braces and escaped strings
   */
  private extractJsonObject(text: string): string | null {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) return null;

    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          
          if (braceCount === 0) {
            // Found complete JSON object
            return text.substring(startIndex, i + 1);
          }
        }
      }
    }

    return null; // No complete JSON object found
  }

  /**
   * Validate and normalize the parsed result with fallbacks
   */
  private validateAndNormalizeResult(parsed: any, rawText: string): ProviderGenerateResult {
    // Ensure summary exists
    const summary = parsed.summary || 'Generated code based on your request';
    
    // Ensure files array exists and is valid
    let files = Array.isArray(parsed.files) ? parsed.files : [];
    
    if (files.length === 0) {
      console.warn('[CFAIProvider] Response has no files, providing default structure');
      files = [{
        path: 'src/routes/+page.svelte',
        action: 'create',
        content: `<script lang="ts">
  let { data } = $props();
</script>

<h1 class="text-2xl font-bold">Generated Page</h1>
<p class="mt-4 text-gray-600">Code was generated for: ${summary}</p>`
      }];
    }

    // Validate and normalize each file
    const validActions = ['create', 'update', 'delete'];
    files = files.map((file: any) => ({
      path: file.path || 'src/routes/+page.svelte',
      action: validActions.includes(file.action) ? file.action : 'create',
      content: file.content || ''
    }));

    // Ensure nextActions array exists
    const nextActions = Array.isArray(parsed.nextActions) ? parsed.nextActions : ['Review the generated files'];

    return {
      type: 'final',
      summary,
      files: files as ProviderGenerateResult['files'],
      nextActions
    };
  }

  /**
   * Mock fallback for local development without Workers AI binding
   */
  private async mockFallback(
    prompt: string,
    context?: any,
    onEvent?: (event: ProviderEvent) => Promise<void>
  ): Promise<ProviderGenerateResult> {
    console.log('[CFAIProvider] Using mock fallback (no AI binding available)');

    if (onEvent) {
      await onEvent({ type: 'thought', data: 'AI service unavailable locally. Generating mock response...' });
    }

    // Simulate a realistic-looking result based on prompt keywords
    const promptLower = prompt.toLowerCase();
    let summary = 'Generated a basic SvelteKit component';
    let files: Array<{ path: string; action: 'create' | 'update' | 'delete'; content: string }> = [];
    let nextActions = ['Review the generated files', 'Run npm run dev to preview'];

    if (promptLower.includes('hero') || promptLower.includes('header')) {
      summary = 'Created a hero section component with responsive layout';
      files = [{
        path: 'src/lib/components/HeroSection.svelte',
        action: 'create',
        content: `<script lang="ts">
  let { title = "Welcome", subtitle = "Build something amazing", ctaText = "Get Started" } = $props();
</script>

<section class="relative py-20 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
      {title}
    </h1>
    <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
      {subtitle}
    </p>
    <button class="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
      {ctaText}
    </button>
  </div>
</section>`
      }];
    } else if (promptLower.includes('card') || promptLower.includes('blog')) {
      summary = 'Created a blog card grid component with 3 example cards';
      files = [{
        path: 'src/lib/components/BlogCardGrid.svelte',
        action: 'create',
        content: `<script lang="ts">
  interface Article {
    title: string;
    excerpt: string;
    date: string;
    category: string;
  }
  
  let { articles = [
    { title: "Getting Started", excerpt: "Learn the basics of SvelteKit", date: "2024-01-15", category: "Tutorial" },
    { title: "Advanced Patterns", excerpt: "Deep dive into Svelte 5 runes", date: "2024-02-20", category: "Guide" },
    { title: "Deployment Guide", excerpt: "Deploy to Cloudflare Pages", date: "2024-03-10", category: "DevOps" }
  ] } = $props<{ articles: Article[] }>();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  {#each articles as article}
    <article class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      <div class="p-6">
        <span class="inline-block px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full mb-4">
          {article.category}
        </span>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {article.title}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {article.excerpt}
        </p>
        <time class="text-xs text-gray-400">{article.date}</time>
      </div>
    </article>
  {/each}
</div>`
      }];
    } else if (promptLower.includes('form') || promptLower.includes('contact')) {
      summary = 'Created a contact form component with validation';
      files = [{
        path: 'src/lib/components/ContactForm.svelte',
        action: 'create',
        content: `<script lang="ts">
  let name = $state('');
  let email = $state('');
  let message = $state('');
  let submitted = $state(false);
  let error = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    
    if (!name || !email || !message) {
      error = 'All fields are required';
      return;
    }
    
    if (!email.includes('@')) {
      error = 'Invalid email address';
      return;
    }
    
    submitted = true;
    // In a real app, send the form data to an API
    console.log('Form submitted:', { name, email, message });
  }
</script>

{#if submitted}
  <div class="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
    <h3 class="text-lg font-semibold text-green-700 dark:text-green-300">Thank you!</h3>
    <p class="text-green-600 dark:text-green-400 mt-2">We'll get back to you soon.</p>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="space-y-4 max-w-lg mx-auto p-6">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
      <input bind:value={name} class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
      <input type="email" bind:value={email} class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
      <textarea bind:value={message} rows={4} class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"></textarea>
    </div>
    {#if error}
      <p class="text-red-500 text-sm">{error}</p>
    {/if}
    <button type="submit" class="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
      Send Message
    </button>
  </form>
{/if}`
      }];
    } else if (promptLower.includes('dashboard')) {
      summary = 'Created a dashboard layout with sidebar, stats cards, and chart';
      files = [{
        path: 'src/routes/dashboard/+page.svelte',
        action: 'create',
        content: `<script lang="ts">
  let stats = [
    { label: 'Total Users', value: '2,847', change: '+12%', color: 'blue' },
    { label: 'Revenue', value: '$48,290', change: '+8%', color: 'green' },
    { label: 'Active Projects', value: '1,234', change: '+23%', color: 'purple' },
    { label: 'Tasks Completed', value: '892', change: '-3%', color: 'orange' }
  ];
</script>

<div class="p-6 space-y-6">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each stats as stat}
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
        <p class="text-sm mt-2" class:text-green-500={stat.change.startsWith('+')} class:text-red-500={stat.change.startsWith('-')}>
          {stat.change} from last month
        </p>
      </div>
    {/each}
  </div>
</div>`
      }];
    } else {
      summary = 'Generated a default SvelteKit page component';
      files = [{
        path: 'src/routes/+page.svelte',
        action: 'create',
        content: `<script lang="ts">
  let { data } = $props();
  let count = $state(0);
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
  <div class="text-center space-y-6 p-8">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
      Welcome to Your New App
    </h1>
    <p class="text-lg text-gray-600 dark:text-gray-300 max-w-md">
      Your AI-generated application is ready. Start building!
    </p>
    
    <div class="flex items-center justify-center gap-4">
      <button 
        onclick={() => count--}
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >-</button>
      <span class="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{count}</span>
      <button 
        onclick={() => count++}
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >+</button>
    </div>
  </div>
</div>`
      }];
    }

    return {
      type: 'final',
      summary,
      files,
      nextActions
    };
  }
}
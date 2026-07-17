# TASK 19_01: Tool Registry & Base Classes

## هدف
ایجاد زیرساخت اصلی برای مدیریت toolها: registry، کلاس پایه و type definitions.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/ToolRegistry.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/BaseTool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/types.ts` (CREATE)

## پیاده‌سازی

### Step 1: Create types.ts

```typescript
// cloudflare/platform-api/src/agents/tools/types.ts

import { z } from 'zod';

// Tool context passed to execute()
export interface ToolContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  agentId?: string;
  requestId: string;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    duration: number;
    attempts: number;
    cached: boolean;
    timestamp: number;
  };
}

// Tool error types
export class ToolValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

export class ToolExecutionError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class ToolTimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'ToolTimeoutError';
  }
}

export class RetryableError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

// Base tool interface
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  returns: z.ZodSchema;
  
  execute(params: any, context: ToolContext): Promise<ToolResult>;
  
  // Optional configuration
  timeout?: number;
  retries?: number;
  permissions?: string[];
}
```

### Step 2: Create BaseTool.ts

```typescript
// cloudflare/platform-api/src/agents/tools/BaseTool.ts

import { Tool, ToolContext, ToolResult, ToolValidationError, RetryableError } from './types';
import { z } from 'zod';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: z.ZodSchema;
  abstract returns: z.ZodSchema;
  
  // Default configuration
  timeout = 30000; // 30s default
  retries = 3;
  permissions: string[] = [];
  
  // Template method pattern
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    let attempts = 0;
    
    while (attempts <= this.retries) {
      attempts++;
      
      try {
        // Validate parameters
        const validatedParams = this.parameters.parse(params);
        
        // Execute with timeout
        const result = await this.executeWithTimeout(validatedParams, context);
        
        return {
          success: true,
          data: result,
          metadata: {
            duration: Date.now() - startTime,
            attempts,
            cached: false,
            timestamp: Date.now()
          }
        };
        
      } catch (error: any) {
        if (attempts === this.retries || !this.shouldRetry(error)) {
          return {
            success: false,
            error: error.message,
            metadata: {
              duration: Date.now() - startTime,
              attempts,
              cached: false,
              timestamp: Date.now()
            }
          };
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: 'Max retries exceeded',
      metadata: {
        duration: Date.now() - startTime,
        attempts,
        cached: false,
        timestamp: Date.now()
      }
    };
  }
  
  // Execute with timeout
  private async executeWithTimeout(params: any, context: ToolContext): Promise<any> {
    return Promise.race([
      this.doExecute(params, context),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new ToolTimeoutError(`Tool ${this.name} timed out after ${this.timeout}ms`, this.timeout));
        }, this.timeout);
      })
    ]);
  }
  
  // Abstract method for actual implementation
  protected abstract doExecute(params: any, context: ToolContext): Promise<any>;
  
  // Determine if error is retryable
  protected shouldRetry(error: any): boolean {
    if (error instanceof ToolTimeoutError) return true;
    if (error instanceof RetryableError) return true;
    if (error instanceof ToolValidationError) return false;
    
    // Retry on network errors
    if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      return true;
    }
    
    // Retry on rate limit
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return true;
    }
    
    return false;
  }
  
  // Helper to create retryable error
  protected retryable(message: string, retryAfter?: number): never {
    throw new RetryableError(message, retryAfter);
  }
}
```

### Step 3: Create ToolRegistry.ts

```typescript
// cloudflare/platform-api/src/agents/tools/ToolRegistry.ts

import { Tool } from './types';
import { z } from 'zod';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();
  
  private constructor() {}
  
  // Singleton pattern
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  // Register a tool
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool ${tool.name} already registered, overwriting`);
    }
    
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }
  
  // Get tool by name
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  // List all tools
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  // List tool names
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  // Get tools by permission
  getByPermission(permission: string): Tool[] {
    return this.list().filter(tool => 
      tool.permissions?.includes(permission)
    );
  }
  
  // Get tools for specific agent type
  getForAgent(agentType: string): Tool[] {
    // Return tools allowed for this agent type
    // This can be extended with agent-specific permissions
    return this.list();
  }
  
  // Check if tool exists
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  // Generate CopilotKit-compatible tool description
  getCopilotKitSchema(name: string): any {
    const tool = this.get(name);
    if (!tool) return null;
    
    // Convert Zod schema to JSON schema
    const parametersSchema = schemaToJsonSchema(tool.parameters);
    const returnsSchema = schemaToJsonSchema(tool.returns);
    
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: parametersSchema,
        returns: returnsSchema
      }
    };
  }
  
  // Get all tools as CopilotKit schema
  getAllCopilotKitSchemas(): any[] {
    return this.listNames()
      .map(name => this.getCopilotKitSchema(name))
      .filter(schema => schema !== null);
  }
  
  // Clear all tools (for testing)
  clear(): void {
    this.tools.clear();
  }
}

// Helper function to convert Zod schema to JSON schema
function schemaToJsonSchema(schema: z.ZodSchema): any {
  // This is a simplified version
  // In production, use zod-to-json-schema library
  try {
    return JSON.parse(JSON.stringify(schema));
  } catch {
    return { type: 'object', properties: {} };
  }
}
```

### Step 4: Usage Example

```typescript
// Example usage in agent code

import { ToolRegistry } from './ToolRegistry';
import { BaseTool } from './BaseTool';
import { z } from 'zod';

// Define a simple tool
class GreetingTool extends BaseTool {
  name = 'greet';
  description = 'Greet a user';
  
  parameters = z.object({
    name: z.string().describe('User name'),
    language: z.enum(['en', 'fa', 'es']).optional()
  });
  
  returns = z.object({
    message: z.string()
  });
  
  protected async doExecute(params: any, context: ToolContext): Promise<any> {
    const greetings = {
      en: `Hello, ${params.name}!`,
      fa: `سلام، ${params.name}!`,
      es: `¡Hola, ${params.name}!`
    };
    
    return {
      message: greetings[params.language || 'en']
    };
  }
}

// Register tool
const registry = ToolRegistry.getInstance();
registry.register(new GreetingTool());

// Use tool
const result = await registry.get('greet')?.execute(
  { name: 'John', language: 'fa' },
  { tenantId: '1', userId: '1', requestId: '123' }
);

console.log(result); // { success: true, data: { message: 'سلام، John!' } }
```

## خروجی قابل مشاهده
- ToolRegistry singleton ایجاد می‌شود
- BaseTool کلاس پایه with retry/timeout logic
- Type definitions کامل
- مثال استفاده ready برای تست

## معیارهای موفقیت
- [ ] Types بدون خطا compile می‌شوند
- [ ] BaseTool retry logic works
- [ ] ToolRegistry register/get/list کار می‌کند
- [ ] Singleton pattern verified
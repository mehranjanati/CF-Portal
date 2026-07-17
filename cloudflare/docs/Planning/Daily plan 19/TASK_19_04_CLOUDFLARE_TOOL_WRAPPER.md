# TASK 19_04: Cloudflare Tool Wrapper

## هدف
Wrap کردن Cloudflare deployment tool برای استفاده در CopilotKit agents.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/CloudflareTool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/CloudflareClient.ts` (CREATE - wrapper)

## پیاده‌سازی

### Step 1: Create CloudflareClient.ts

```typescript
// cloudflare/platform-api/src/agents/tools/CloudflareClient.ts

export interface CloudflareWorker {
  id: string;
  name: string;
  status: string;
  url?: string;
  created_on: string;
  last_modified: string;
}

export interface CloudflareDeployment {
  id: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  url: string;
  created_at: string;
}

export class CloudflareClient {
  private apiToken: string;
  private accountId: string;
  private apiUrl = 'https://api.cloudflare.com/client/v4';
  
  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new CloudflareAPIError(response.status, error.errors?.[0]?.message || error.message);
    }
    
    return response.json();
  }
  
  // Deploy a worker
  async deployWorker(scriptName: string, wasmModule: ArrayBuffer, metadata?: any): Promise<CloudflareDeployment> {
    const formData = new FormData();
    const blob = new Blob([wasmModule], { type: 'application/javascript' });
    formData.append('file', blob, 'worker.js');
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    const response = await fetch(
      `${this.apiUrl}/accounts/${this.accountId}/workers/scripts/${scriptName}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
        body: formData
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new CloudflareAPIError(response.status, error.errors?.[0]?.message || 'Deployment failed');
    }
    
    return response.json();
  }
  
  // Get worker status
  async getWorker(scriptName: string): Promise<CloudflareWorker> {
    return this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
  }
  
  // List workers
  async listWorkers(): Promise<CloudflareWorker[]> {
    const response = await this.request(`/accounts/${this.accountId}/workers/scripts`);
    return response.result || [];
  }
  
  // Delete worker
  async deleteWorker(scriptName: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, {
      method: 'DELETE'
    });
  }
  
  // Rollback to previous version
  async rollbackWorker(scriptName: string, previousVersionId: string): Promise<CloudflareDeployment> {
    // Cloudflare doesn't have native rollback, so we redeploy previous version
    // This would require storing previous versions in R2
    throw new Error('Rollback not implemented - requires version storage');
  }
  
  // Get worker logs
  async getWorkerLogs(scriptName: string, hours: number = 1): Promise<any> {
    return this.request(
      `/accounts/${this.accountId}/workers/scripts/${scriptName}/logs?hours=${hours}`
    );
  }
}

export class CloudflareAPIError extends Error {
  constructor(public status: number, message: string) {
    super(`Cloudflare API Error ${status}: ${message}`);
    this.name = 'CloudflareAPIError';
  }
}
```

### Step 2: Create CloudflareTool.ts

```typescript
// cloudflare/platform-api/src/agents/tools/CloudflareTool.ts

import { BaseTool } from './BaseTool';
import { ToolContext, ToolResult } from './types';
import { z } from 'zod';
import { CloudflareClient, CloudflareAPIError } from './CloudflareClient';

export class CloudflareTool extends BaseTool {
  name = 'cloudflare_operations';
  description = 'Perform Cloudflare operations: deploy workers, check status, manage deployments';
  
  parameters = z.object({
    operation: z.enum(['deploy', 'get_worker', 'list_workers', 'delete_worker', 'get_logs'])
      .describe('Cloudflare operation to perform'),
    
    // Worker info
    scriptName: z.string().describe('Worker script name'),
    wasmModule: z.string().optional().describe('Worker code (base64 encoded)'),
    
    // Optional parameters
    metadata: z.any().optional().describe('Worker metadata (routes, compatibility_flags, etc.)'),
    hours: z.number().optional().describe('Hours of logs to fetch')
  });
  
  returns = z.object({
    success: z.boolean(),
    data: z.any(),
    url: z.string().optional(),
    message: z.string().optional()
  });
  
  private cloudflareClient: CloudflareClient;
  
  constructor(apiToken: string, accountId: string) {
    super();
    this.cloudflareClient = new CloudflareClient(apiToken, accountId);
    this.timeout = 20000; // 20s for Cloudflare API
    this.retries = 3;
  }
  
  protected async doExecute(params: any, context: ToolContext): Promise<any> {
    const { operation } = params;
    
    try {
      switch (operation) {
        case 'deploy':
          return await this.deployWorker(params, context);
        
        case 'get_worker':
          return await this.getWorker(params, context);
        
        case 'list_workers':
          return await this.listWorkers(params, context);
        
        case 'delete_worker':
          return await this.deleteWorker(params, context);
        
        case 'get_logs':
          return await this.getLogs(params, context);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
    } catch (error: any) {
      if (error instanceof CloudflareAPIError) {
        // Handle specific Cloudflare errors
        if (error.status === 429) {
          throw this.retryable('Cloudflare rate limit exceeded', 60000);
        }
        
        if (error.status === 401 || error.status === 403) {
          // Don't retry auth errors
          throw new Error('Cloudflare authentication failed');
        }
        
        if (error.status === 404) {
          // Don't retry not found
          throw new Error('Cloudflare worker not found');
        }
      }
      
      // Retry on other errors
      throw this.retryable(error.message);
    }
  }
  
  private async deployWorker(params: any, context: ToolContext): Promise<any> {
    const { scriptName, wasmModule, metadata } = params;
    
    if (!scriptName || !wasmModule) {
      throw new Error('scriptName and wasmModule are required for deploy operation');
    }
    
    // Decode base64 wasm module
    const wasmBuffer = Buffer.from(wasmModule, 'base64');
    
    const deployment = await this.cloudflareClient.deployWorker(
      scriptName,
      wasmBuffer,
      metadata
    );
    
    return {
      success: true,
      data: deployment,
      url: deployment.url,
      message: `Worker ${scriptName} deployed successfully`
    };
  }
  
  private async getWorker(params: any, context: ToolContext): Promise<any> {
    const { scriptName } = params;
    
    if (!scriptName) {
      throw new Error('scriptName is required for get_worker operation');
    }
    
    const worker = await this.cloudflareClient.getWorker(scriptName);
    
    return {
      success: true,
      data: worker,
      message: `Worker ${scriptName} retrieved successfully`
    };
  }
  
  private async listWorkers(params: any, context: ToolContext): Promise<any> {
    const workers = await this.cloudflareClient.listWorkers();
    
    return {
      success: true,
      data: workers,
      message: `Found ${workers.length} workers`
    };
  }
  
  private async deleteWorker(params: any, context: ToolContext): Promise<any> {
    const { scriptName } = params;
    
    if (!scriptName) {
      throw new Error('scriptName is required for delete_worker operation');
    }
    
    await this.cloudflareClient.deleteWorker(scriptName);
    
    return {
      success: true,
      message: `Worker ${scriptName} deleted successfully`
    };
  }
  
  private async getLogs(params: any, context: ToolContext): Promise<any> {
    const { scriptName, hours = 1 } = params;
    
    if (!scriptName) {
      throw new Error('scriptName is required for get_logs operation');
    }
    
    const logs = await this.cloudflareClient.getWorkerLogs(scriptName, hours);
    
    return {
      success: true,
      data: logs,
      message: `Retrieved logs for ${scriptName}`
    };
  }
}
```

### Step 3: Registration

```typescript
// In platform-api initialization

const cfApiToken = env.CLOUDFLARE_API_TOKEN;
const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;

if (cfApiToken && cfAccountId) {
  const cloudflareTool = new CloudflareTool(cfApiToken, cfAccountId);
  ToolRegistry.getInstance().register(cloudflareTool);
}
```

### Step 4: Usage Example

```typescript
// Deploy a worker
const result = await registry.get('cloudflare_operations')?.execute(
  {
    operation: 'deploy',
    scriptName: 'my-worker',
    wasmModule: Buffer.from(workerCode).toString('base64'),
    metadata: {
      compatibility_flags: ['nodejs_compat'],
      routes: [{ pattern: 'example.com/*', zone_name: 'example.com' }]
    }
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// Get worker status
const result = await registry.get('cloudflare_operations')?.execute(
  {
    operation: 'get_worker',
    scriptName: 'my-worker'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// List all workers
const result = await registry.get('cloudflare_operations')?.execute(
  {
    operation: 'list_workers'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);
```

## خروجی قابل مشاهده
- CloudflareTool کلاس ایجاد می‌شود
- 5 عملیات Cloudflare پشتیبانی می‌شود
- Worker deployment support
- API error handling
- Rate limit management

## معیارهای موفقیت
- [ ] CloudflareTool compile می‌شود
- [ ] deploy کار می‌کند
- [ ] get_worker کار می‌کند
- [ ] list_workers کار می‌کند
- [ ] delete_worker کار می‌کند
- [ ] get_logs کار می‌کند
- [ ] Auth errors handled
- [ ] Rate limits handled
# TASK 21_01: Sandbox Execution Environment

## هدف
ایجاد محیط اجرای ایزوله برای agent tools.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/sandbox/SandboxWorker.ts` (CREATE)
- `cloudflare/platform-api/src/agents/sandbox/ResourceLimits.ts` (CREATE)
- `cloudflare/wrangler.toml` (UPDATE)

## پیاده‌سازی

### Step 1: Create SandboxWorker.ts

```typescript
// Isolated Worker for tool execution
export class SandboxWorker {
  async execute(tool: string, params: any, context: ToolContext): Promise<ToolResult> {
    // Execute in isolated environment
    // Enforce resource limits
    // Return result
  }
}
```

### Step 2: Create ResourceLimits.ts

```typescript
// Resource limits for sandbox
export interface ResourceLimits {
  cpuTime: number;      // ms
  memory: number;       // MB
  networkRequests: number;
  storageSize: number;  // MB
}
```

## معیارهای موفقیت
- [ ] Tools execute in isolation
- [ ] Resource limits enforced
- [ ] No cross-contamination
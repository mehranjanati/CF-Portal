# TASK 19_06: Timeout & Retry Logic

## هدف
پیاده‌سازی مکانیزم یکپارچه timeout و retry برای تمام toolها.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/TimeoutManager.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/RetryPolicy.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/CircuitBreaker.ts` (CREATE)

## پیاده‌سازی

### Step 1: Create TimeoutManager.ts

```typescript
// cloudflare/platform-api/src/agents/tools/TimeoutManager.ts

export class TimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Set timeout for a tool execution
  setTimeout(key: string, fn: () => void, delay: number): void {
    // Clear existing timeout if any
    this.clearTimeout(key);
    
    const timeout = setTimeout(() => {
      fn();
      this.timeouts.delete(key);
    }, delay);
    
    this.timeouts.set(key, timeout);
  }
  
  // Get remaining time
  getRemaining(key: string): number {
    // This is simplified - in production track start time
    return 30000; // Default 30s
  }
  
  // Clear timeout
  clearTimeout(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }
  
  // Clear all timeouts
  clearAll(): void {
    for (const [key, timeout] of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
  
  // Check if timeout exists
  has(key: string): boolean {
    return this.timeouts.has(key);
  }
}
```

### Step 2: Create RetryPolicy.ts

```typescript
// cloudflare/platform-api/src/agents/tools/RetryPolicy.ts

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RetryPolicy {
  private config: RetryConfig;
  
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffFactor: config.backoffFactor || 2
    };
  }
  
  // Calculate delay for next retry
  getDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }
  
  // Check if should retry
  shouldRetry(attempt: number, error: any): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }
    
    // Don't retry validation errors
    if (error instanceof ToolValidationError) {
      return false;
    }
    
    // Retry on timeout, network, rate limit
    if (error instanceof ToolTimeoutError) {
      return true;
    }
    
    if (error.message?.includes('network') || 
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND')) {
      return true;
    }
    
    if (error.message?.includes('rate limit') || 
        error.message?.includes('429') ||
        error.message?.includes('503')) {
      return true;
    }
    
    return false;
  }
  
  // Sleep for delay
  async sleep(attempt: number): Promise<void> {
    const delay = this.getDelay(attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### Step 3: Create CircuitBreaker.ts

```typescript
// cloudflare/platform-api/src/agents/tools/CircuitBreaker.ts

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000 // 1 minute
    };
  }
  
  // Execute with circuit breaker
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }
  
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastFailureTime = Date.now();
    }
  }
  
  // Get current state
  getState(): CircuitState {
    return this.state;
  }
  
  // Get failure count
  getFailures(): number {
    return this.failures;
  }
  
  // Reset circuit breaker
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
  }
}
```

### Step 4: Integration with BaseTool

```typescript
// Update BaseTool.ts to use timeout, retry, and circuit breaker

export abstract class BaseTool implements Tool {
  // Existing code...
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    let attempts = 0;
    
    // Initialize retry policy
    const retryPolicy = new RetryPolicy({
      maxAttempts: this.retries,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    });
    
    // Initialize circuit breaker (singleton per tool)
    const circuitBreaker = this.getCircuitBreaker();
    
    while (attempts <= this.retries) {
      attempts++;
      
      try {
        // Validate parameters
        const validatedParams = this.parameters.parse(params);
        
        // Check circuit breaker
        const result = await circuitBreaker.execute(async () => {
          // Execute with timeout
          return await this.executeWithTimeout(validatedParams, context);
        });
        
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
        if (attempts === this.retries || !retryPolicy.shouldRetry(attempts, error)) {
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
        
        // Wait before retry
        await retryPolicy.sleep(attempts);
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
  
  // Get circuit breaker for this tool
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  private getCircuitBreaker(): CircuitBreaker {
    if (!this.circuitBreakers.has(this.name)) {
      this.circuitBreakers.set(this.name, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000
      }));
    }
    return this.circuitBreakers.get(this.name)!;
  }
}
```

### Step 5: Configuration per Tool

```typescript
// Tool-specific configurations
const TOOL_CONFIGS = {
  ai_generate: {
    timeout: 30000,
    retries: 3,
    circuitBreaker: { failureThreshold: 5, timeout: 60000 }
  },
  github_operations: {
    timeout: 15000,
    retries: 3,
    circuitBreaker: { failureThreshold: 5, timeout: 60000 }
  },
  cloudflare_operations: {
    timeout: 20000,
    retries: 3,
    circuitBreaker: { failureThreshold: 3, timeout: 60000 }
  },
  browser_automation: {
    timeout: 10000,
    retries: 2,
    circuitBreaker: { failureThreshold: 3, timeout: 30000 }
  }
};
```

## خروجی قابل مشاهده
- TimeoutManager کلاس ایجاد می‌شود
- RetryPolicy با exponential backoff پیاده می‌شود
- CircuitBreaker برای جلوگیری از cascade failures
- Integration با BaseTool کامل می‌شود
- Configuration per tool ready

## معیارهای موفقیت
- [ ] TimeoutManager کامپایل می‌شود
- [ ] RetryPolicy exponential backoff کار می‌کند
- [ ] CircuitBreaker open/close states کار می‌کنند
- [ ] Integration با BaseTool سالم است
- [ ] Per-tool configurations اعمال می‌شوند
# TASK 15-04: Parallel Execution with Workflow Fan-Out

## Objective
Implement parallel agent execution using Cloudflare Workflows' built-in fan-out/fan-in patterns, replacing custom ParallelExecutor with Workflows-native concurrent step execution.

## Prerequisites
- TASK 15-01 completed (Agent Runtime Foundation)
- TASK 15-02 completed (Workflow Definition)
- TASK 15-03 completed (Tool Ecosystem)

## Implementation

### Step 1: Parallel Executor Core

Create `platform-api/src/orchestration/parallel-executor.ts`:
```typescript
export interface ParallelExecutionOptions {
  maxRetries?: number;
  timeout?: number;
  continueOnError?: boolean;
  retryDelay?: number;
}

export interface ParallelResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  duration: number;
}

export class ParallelExecutor {
  async executeAll<T>(
    tasks: Array<() => Promise<T>>,
    options: ParallelExecutionOptions = {}
  ): Promise<ParallelResult<T>[]> {
    const {
      maxRetries = 3,
      timeout = 30000,
      continueOnError = true,
      retryDelay = 1000
    } = options;

    const results = await Promise.allSettled(
      tasks.map(task => this.executeWithTimeout(task, timeout, maxRetries, retryDelay))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          success: true,
          data: result.value,
          attempts: 1,
          duration: 0 // Will be populated by executeWithTimeout
        } as ParallelResult<T>;
      } else {
        if (!continueOnError) {
          throw result.reason;
        }
        return {
          success: false,
          error: result.reason.message,
          attempts: maxRetries,
          duration: 0
        } as ParallelResult<T>;
      }
    });
  }

  private async executeWithTimeout<T>(
    task: () => Promise<T>,
    timeout: number,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(task(), timeout);
      } catch (error) {
        lastError = error as Error;
        console.error(`[ParallelExecutor] Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}
```

### Step 2: Circuit Breaker Pattern

Create `platform-api/src/orchestration/circuit-breaker.ts`:
```typescript
export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject calls
  HALF_OPEN = 'half_open' // Testing if recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes to close from half-open
  timeout: number;             // Time in OPEN state before half-open
  resetTimeout: number;        // Time before manual reset
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      // Transition to half-open
      this.state = CircuitState.HALF_OPEN;
      console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
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
        console.log('[CircuitBreaker] Transitioning to CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successes = 0;
      console.log('[CircuitBreaker] Back to OPEN');
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      console.log(`[CircuitBreaker] Opening after ${this.failures} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    console.log('[CircuitBreaker] Reset to CLOSED');
  }
}

// Circuit breaker instances for each agent type
export const agentCircuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(agentType: string): CircuitBreaker {
  if (!agentCircuitBreakers.has(agentType)) {
    agentCircuitBreakers.set(agentType, new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      resetTimeout: 300000 // 5 minutes
    }));
  }
  return agentCircuitBreakers.get(agentType)!;
}
```

### Step 3: Retry Policy with Jitter

Create `platform-api/src/orchestration/retry-policy.ts`:
```typescript
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

export class RetryPolicy {
  constructor(private config: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterFactor: 0.5
  }) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        console.log(`[RetryPolicy] Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelay);
  }
}

// Retry policies for different operations
export const retryPolicies = {
  ai_generation: new RetryPolicy({
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    jitterFactor: 0.3
  }),
  github_api: new RetryPolicy({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    jitterFactor: 0.5
  }),
  sandbox_exec: new RetryPolicy({
    maxRetries: 2,
    baseDelay: 5000,
    maxDelay: 15000,
    jitterFactor: 0.2
  })
};
```

### Step 4: Update OrchestratorDO for Parallel Execution

Update `platform-api/src/orchestration/OrchestratorDO.ts`:
```typescript
import { ParallelExecutor } from './parallel-executor';
import { getCircuitBreaker } from './circuit-breaker';

export class OrchestratorDO extends DurableObject<Env> {
  private parallelExecutor: ParallelExecutor;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.parallelExecutor = new ParallelExecutor();
    // ... existing code ...
  }

  private async triggerNextAgent(): Promise<void> {
    const state = this.ctx!.currentState;

    // REVIEW + TEST in parallel
    if (state === OrchestrationState.REVIEWING) {
      const generationResult = this.ctx!.data.get(OrchestrationEvent.GENERATION_COMPLETE);
      const files = generationResult?.output?.files;

      // Execute reviewer and tester in parallel
      const results = await this.parallelExecutor.executeAll(
        [
          () => this.executeAgent('reviewer', { files }),
          () => this.executeAgent('tester', { files })
        ],
        {
          maxRetries: 2,
          timeout: 60000,
          continueOnError: false
        }
      );

      const [reviewResult, testResult] = results;

      if (reviewResult.success && testResult.success) {
        // Both passed, proceed to deploy
        await this.stateMachine!.transition(OrchestrationEvent.REVIEW_COMPLETE, reviewResult.data);
      } else if (!reviewResult.success && !testResult.success) {
        // Both failed, go to fixing
        await this.stateMachine!.transition(OrchestrationEvent.REVIEW_COMPLETE, {
          passed: false,
          canAutoFix: true,
          issues: [...(reviewResult.data?.issues || []), ...(testResult.data?.issues || [])]
        });
      } else {
        // One failed, continue based on which one
        if (reviewResult.success) {
          await this.stateMachine!.transition(OrchestrationEvent.REVIEW_COMPLETE, {
            passed: true,
            canAutoFix: testResult.data?.canAutoFix
          });
        } else {
          await this.stateMachine!.transition(OrchestrationEvent.TEST_COMPLETE, {
            passed: testResult.data?.passed,
            canAutoFix: reviewResult.data?.canAutoFix
          });
        }
      }
      return;
    }

    // ... rest of existing switch cases ...
  }

  private async executeAgent(agentType: string, input: any): Promise<any> {
    const circuitBreaker = getCircuitBreaker(agentType);
    
    return circuitBreaker.execute(async () => {
      const agent = this.agentRegistry.getAllByType(agentType)[0];
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      const result = await agent.executeWithRetry(input);
      
      if (!result.success) {
        throw new Error(result.error || `Agent ${agentType} failed`);
      }

      return result;
    });
  }

  private async handleEvent(request: Request): Promise<Response> {
    // ... existing code ...
    
    // After state transition, check if we need to trigger parallel agents
    if (this.ctx!.currentState === OrchestrationState.REVIEWING) {
      await this.triggerNextAgent();
    }

    // ... rest of existing code ...
  }
}
```

### Step 5: Timeout Management

Create `platform-api/src/orchestration/timeout-manager.ts`:
```typescript
export interface TimeoutConfig {
  generation: number;      // 30s
  review: number;          // 10s
  test: number;            // 20s
  deploy: number;          // 15s
  total: number;           // 120s
}

export class TimeoutManager {
  private startTime: number;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: TimeoutConfig = {
    generation: 30000,
    review: 10000,
    test: 20000,
    deploy: 15000,
    total: 120000
  };

  constructor(private orchestrationId: string) {
    this.startTime = Date.now();
  }

  startTotalTimeout(onTimeout: () => void): void {
    const timeout = setTimeout(() => {
      console.error(`[TimeoutManager] Total timeout exceeded for ${this.orchestrationId}`);
      onTimeout();
    }, this.config.total);

    this.timeouts.set('total', timeout);
  }

  startPhaseTimeout(phase: string, onTimeout: () => void): void {
    const duration = this.config[phase as keyof TimeoutConfig] || 30000;
    const timeout = setTimeout(() => {
      console.error(`[TimeoutManager] Phase ${phase} timeout exceeded`);
      onTimeout();
    }, duration);

    this.timeouts.set(phase, timeout);
  }

  cancelTimeout(phase: string): void {
    const timeout = this.timeouts.get(phase);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(phase);
    }
  }

  cancelAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  getRemainingTime(): number {
    return Math.max(0, this.config.total - this.getElapsedTime());
  }
}
```

### Step 6: Result Aggregation

Create `platform-api/src/orchestration/result-aggregator.ts`:
```typescript
export interface AggregatedResult {
  success: boolean;
  passed: boolean;
  outputs: Map<string, any>;
  errors: string[];
  warnings: string[];
  metrics: {
    totalDuration: number;
    agentDurations: Map<string, number>;
    retryCount: number;
  };
}

export class ResultAggregator {
  private results: Map<string, any> = new Map();
  private errors: string[] = [];
  private warnings: string[] = [];
  private startTimes: Map<string, number> = new Map();

  recordStart(agentId: string): void {
    this.startTimes.set(agentId, Date.now());
  }

  recordResult(agentId: string, result: any): void {
    this.results.set(agentId, result);

    if (!result.success) {
      this.errors.push(`[${agentId}] ${result.error}`);
    }

    if (result.warnings) {
      this.warnings.push(...result.warnings);
    }
  }

  getAggregatedResult(): AggregatedResult {
    const allSuccess = Array.from(this.results.values()).every(r => r.success);
    const totalDuration = Date.now() - (this.startTimes.values().next().value || Date.now());
    
    const agentDurations = new Map<string, number>();
    this.startTimes.forEach((start, agentId) => {
      const result = this.results.get(agentId);
      agentDurations.set(agentId, result ? (result.metadata?.duration || 0) : 0);
    });

    return {
      success: allSuccess && this.errors.length === 0,
      passed: allSuccess,
      outputs: new Map(this.results),
      errors: this.errors,
      warnings: this.warnings,
      metrics: {
        totalDuration,
        agentDurations,
        retryCount: this.errors.length
      }
    };
  }

  reset(): void {
    this.results.clear();
    this.errors = [];
    this.warnings = [];
    this.startTimes.clear();
  }
}
```

### Step 7: Integration Tests

Create `platform-api/tests/integration/parallel-execution.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ParallelExecutor } from '../../src/orchestration/parallel-executor';
import { CircuitBreaker, CircuitState } from '../../src/orchestration/circuit-breaker';

describe('Parallel Execution Engine', () => {
  it('should execute independent tasks in parallel', async () => {
    const executor = new ParallelExecutor();
    const start = Date.now();

    const results = await executor.executeAll(
      [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'task1';
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'task2';
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'task3';
        }
      ],
      { timeout: 5000 }
    );

    const duration = Date.now() - start;

    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(2000); // Should take ~1s, not 3s
  });

  it('should retry failed tasks', async () => {
    const executor = new ParallelExecutor();
    let attempts = 0;

    const results = await executor.executeAll(
      [
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        }
      ],
      { maxRetries: 3 }
    );

    expect(results[0].success).toBe(true);
    expect(attempts).toBe(3);
  });

  it('should respect timeout', async () => {
    const executor = new ParallelExecutor();

    await expect(
      executor.executeAll(
        [async () => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          return 'success';
        }],
        { timeout: 1000 }
      )
    ).rejects.toThrow('Task timeout');
  });
});

describe('Circuit Breaker', () => {
  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 1000,
      resetTimeout: 5000
    });

    // Fail twice
    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject calls when OPEN', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 10000,
      resetTimeout: 60000
    });

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    
    await expect(breaker.execute(() => Promise.resolve('success'))).rejects.toThrow(
      'Circuit breaker is OPEN - service unavailable'
    );
  });
});
```

## Deliverables
- [ ] ParallelExecutor implementation
- [ ] CircuitBreaker for fault tolerance
- [ ] RetryPolicy with exponential backoff + jitter
- [ ] TimeoutManager for phase and total timeouts
- [ ] ResultAggregator for combining results
- [ ] Integration tests for parallel execution

## Acceptance Criteria
- [ ] Independent tasks execute truly in parallel (not sequential)
- [ ] Failed tasks retry with exponential backoff
- [ ] Circuit breaker opens after 3 consecutive failures
- [ ] Timeouts prevent indefinite hangs
- [ ] Results are aggregated correctly
- [ ] All tests pass
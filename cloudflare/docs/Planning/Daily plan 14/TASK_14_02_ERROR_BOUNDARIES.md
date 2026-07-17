# TASK 14-02: Error Boundary & Resilience Pattern

## Objective
Implement comprehensive error handling across the entire stack to ensure graceful degradation and fast recovery from failures.

## Prerequisites
- TASK 14-01 completed (testing framework in place)
- Error classification strategy defined

## Implementation

### Step 1: Standardized Error Classes

Create `platform-api/src/lib/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'AUTH_ERROR', message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ProviderError extends AppError {
  constructor(provider: string, cause: Error) {
    super(502, 'PROVIDER_ERROR', `AI provider ${provider} failed`, { cause: cause.message });
    this.name = 'ProviderError';
  }
}

export class DatabaseError extends AppError {
  constructor(cause: Error) {
    super(500, 'DATABASE_ERROR', 'Database operation failed', { cause: cause.message });
    this.name = 'DatabaseError';
  }
}
```

### Step 2: Global Error Handler Middleware

Create `platform-api/src/middleware/error-handler.ts`:
```typescript
import { AppError } from '../lib/errors';
import { env } from 'cloudflare:test';

export function errorHandler(error: unknown, request: Request): Response {
  // Log error
  console.error('Unhandled error:', error);

  // Structured error response
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        details: error.details
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Unknown error → 500
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Step 3: Retry with Exponential Backoff

Create `platform-api/src/lib/retry.ts`:
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry?.(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage in provider
export async function callProviderWithRetry(providerFn: () => Promise<string>) {
  return withRetry(providerFn, {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Retry on network errors and 5xx
      return error instanceof TypeError || 
             (error instanceof Response && error.status >= 500);
    }
  });
}
```

### Step 4: Frontend Error Boundary

Create `src/lib/components/ErrorBoundary.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  export let fallback: string = 'Something went wrong';
  export let onError: (error: Error) => void;

  let error: Error | null = null;

  function handleError(event: ErrorEvent) {
    error = event.error;
    onError?.(event.error);
  }

  function reset() {
    error = null;
  }
</script>

{#if error}
  <div class="error-boundary">
    <div class="error-icon">⚠️</div>
    <h2>{fallback}</h2>
    <p class="error-message">{error.message}</p>
    <button on:click={reset}>Try Again</button>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    padding: 2rem;
    text-align: center;
    border: 1px solid #feb2b2;
    border-radius: 8px;
    background: #fff5f5;
  }
</style>
```

### Step 5: Error Recovery in Service Layer

Modify `platform-api/src/modules/builder/service.ts`:
```typescript
export class BuilderService {
  async generateWithFallback(sessionId: number, prompt: string) {
    try {
      // Primary: AI Gateway
      return await this.aiProvider.generate(prompt);
    } catch (gatewayError) {
      console.warn('Gateway failed, falling back to Workers AI:', gatewayError);
      
      try {
        // Fallback: Workers AI
        const fallbackProvider = new CFAIProvider(env.AI);
        return await fallbackProvider.generate(prompt);
      } catch (fallbackError) {
        console.error('All providers failed:', fallbackError);
        throw new ProviderError('all', fallbackError);
      }
    }
  }
}
```

## Deliverables
- [ ] Error classes defined for all failure modes
- [ ] Global error handler returns structured responses
- [ ] Retry logic with exponential backoff
- [ ] Frontend ErrorBoundary component
- [ ] Service layer implements fallback chains

## Acceptance Criteria
- [ ] All API errors return `{ error, code, details? }` format
- [ ] 500 errors automatically retry 2-3 times before failing
- [ ] Frontend shows user-friendly error messages
- [ ] Logs contain structured error context for debugging
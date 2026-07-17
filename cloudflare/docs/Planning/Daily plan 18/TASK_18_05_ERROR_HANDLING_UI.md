# TASK 18_05: Error Handling UI

## هدف
ایجاد سیستم نمایش خطاهای کاربرپسند برای agent executions.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/components/ErrorBoundary.svelte` (CREATE)
- `cloudflare/portal/src/lib/components/ErrorMessage.svelte` (CREATE)

## پیاده‌سازی

### Step 1: Create ErrorMessage.svelte

```svelte
<script lang="ts">
  export let error: string;
  export let type: 'network' | 'tool' | 'agent' | 'timeout' | 'unknown';
  export let details?: any;
  export let onRetry?: () => void;
  export let onDismiss?: () => void;
  
  // Error type configuration
  const errorConfig = {
    network: {
      icon: '🌐',
      title: 'Network Error',
      color: '#ef4444',
      suggestion: 'Check your internet connection and try again.'
    },
    tool: {
      icon: '🔧',
      title: 'Tool Execution Error',
      color: '#f59e0b',
      suggestion: 'The tool failed to execute. This might be temporary.'
    },
    agent: {
      icon: '🤖',
      title: 'Agent Error',
      color: '#8b5cf6',
      suggestion: 'The AI agent encountered an issue. Please try again.'
    },
    timeout: {
      icon: '⏱️',
      title: 'Timeout Error',
      color: '#64748b',
      suggestion: 'The operation took too long. Please try with a simpler request.'
    },
    unknown: {
      icon: '⚠️',
      title: 'Error',
      color: '#64748b',
      suggestion: 'An unexpected error occurred.'
    }
  };
  
  $: config = errorConfig[type];
</script>

<div class="error-message" style="border-left-color: {config.color}">
  <div class="error-header">
    <span class="error-icon">{config.icon}</span>
    <div class="error-title-section">
      <h4 class="error-title">{config.title}</h4>
      <p class="error-suggestion">{config.suggestion}</p>
    </div>
  </div>
  
  <div class="error-body">
    <p class="error-text">{error}</p>
    
    {#if details}
      <details class="error-details">
        <summary>Technical Details</summary>
        <pre class="error-stack">{JSON.stringify(details, null, 2)}</pre>
      </details>
    {/if}
  </div>
  
  {#if onRetry || onDismiss}
    <div class="error-actions">
      {#if onRetry}
        <button onclick={onRetry} class="retry-btn">
          🔄 Retry
        </button>
      {/if}
      {#if onDismiss}
        <button onclick={onDismiss} class="dismiss-btn">
          Dismiss
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .error-message {
    padding: 1rem;
    background: white;
    border-left: 4px solid;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
  }
  
  .error-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .error-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .error-title-section {
    flex: 1;
  }
  
  .error-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }
  
  .error-suggestion {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: #64748b;
  }
  
  .error-body {
    margin-bottom: 0.75rem;
  }
  
  .error-text {
    margin: 0;
    font-size: 0.875rem;
    color: #475569;
  }
  
  .error-details {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
  }
  
  .error-details summary {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 0.5rem;
  }
  
  .error-stack {
    margin: 0;
    font-size: 0.75rem;
    color: #475569;
    overflow-x: auto;
    font-family: monospace;
  }
  
  .error-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .retry-btn {
    background: #3b82f6;
    color: white;
  }
  
  .retry-btn:hover {
    background: #2563eb;
  }
  
  .dismiss-btn {
    background: #f1f5f9;
    color: #64748b;
  }
  
  .dismiss-btn:hover {
    background: #e2e8f0;
  }
</style>
```

### Step 2: Create ErrorBoundary.svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ErrorMessage from './ErrorMessage.svelte';
  import { builderStore } from '$lib/stores/builder.svelte';
  
  let error = $state<any>(null);
  
  // Subscribe to store errors
  $: {
    const storeError = $builderStore.error;
    if (storeError && !error) {
      error = {
        message: storeError,
        type: classifyError(storeError),
        details: storeError
      };
    }
  }
  
  function classifyError(error: string): 'network' | 'tool' | 'agent' | 'timeout' | 'unknown' {
    if (error.includes('timeout') || error.includes('TIMEOUT')) return 'timeout';
    if (error.includes('network') || error.includes('fetch')) return 'network';
    if (error.includes('tool') || error.includes('Tool')) return 'tool';
    if (error.includes('agent') || error.includes('Agent')) return 'agent';
    return 'unknown';
  }
  
  function handleRetry() {
    error = null;
    builderStore.clearError();
    // Trigger retry logic
    window.location.reload();
  }
  
  function handleDismiss() {
    error = null;
    builderStore.clearError();
  }
</script>

{#if error}
  <div class="error-boundary">
    <ErrorMessage 
      error={error.message}
      type={error.type}
      details={error.details}
      onRetry={handleRetry}
      onDismiss={handleDismiss}
    />
  </div>
{/if}

<style>
  .error-boundary {
    position: fixed;
    top: 1rem;
    right: 1rem;
    max-width: 400px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
```

### Step 3: Error Classification Logic

```typescript
// In builder.svelte.ts store

export function classifyError(error: any): {
  type: 'network' | 'tool' | 'agent' | 'timeout' | 'unknown';
  retryable: boolean;
} {
  const message = error.message || String(error);
  
  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    return { type: 'timeout', retryable: true };
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('ENOTFOUND')) {
    return { type: 'network', retryable: true };
  }
  
  if (message.includes('tool') || message.includes('Tool')) {
    return { type: 'tool', retryable: true };
  }
  
  if (message.includes('agent') || message.includes('Agent')) {
    return { type: 'agent', retryable: false };
  }
  
  return { type: 'unknown', retryable: false };
}
```

## خروجی قابل مشاهده
- کامپوننت ErrorMessage ایجاد می‌شود
- کامپوننت ErrorBoundary ایجاد می‌شود
- خطاها بر اساس نوعشان دسته‌بندی می‌شوند
- پیام‌های کاربرپسند نمایش داده می‌شوند
- دکمه Retry برای خطاهای قابل بازیابی

## معیارهای موفقیت
- [ ] کامپوننت‌ها بدون خطا compile می‌شوند
- [ ] خطاها به درستی دسته‌بندی می‌شوند
- [ ] پیام‌های کاربرپسند نمایش داده می‌شوند
- [ ] Retry button برای خطاهای قابل بازیابی
- [ ] Technical details در dropdown قابل مشاهده است
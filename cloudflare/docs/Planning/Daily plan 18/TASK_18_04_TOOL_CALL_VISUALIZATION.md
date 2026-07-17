# TASK 18_04: Tool Call Visualization

## هدف
ایجاد UI برای نمایش tool calls در حال اجرا و تکمیل‌شده.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/components/agents/AgentToolPanel.svelte` (CREATE)
- `cloudflare/portal/src/lib/components/builder/ToolCallItem.svelte` (CREATE)

## پیاده‌سازی

### Step 1: Create AgentToolPanel.svelte

```svelte
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import ToolCallItem from './ToolCallItem.svelte';
  
  $: activeCalls = $builderStore.activeToolCalls;
  $: completedCalls = $builderStore.completedToolCalls;
</script>

<div class="tool-panel">
  <h3 class="panel-title">🛠️ Agent Tools</h3>
  
  {#if activeCalls.length === 0 && completedCalls.length === 0}
    <div class="empty-state">
      <p>No tools executed yet</p>
    </div>
  {/if}
  
  {#if activeCalls.length > 0}
    <div class="section">
      <h4 class="section-title">🟡 Running ({activeCalls.length})</h4>
      <div class="tool-list">
        {#each activeCalls as toolCall}
          <ToolCallItem 
            toolCall={toolCall} 
            status="running"
          />
        {/each}
      </div>
    </div>
  {/if}
  
  {#if completedCalls.length > 0}
    <div class="section">
      <h4 class="section-title">✅ Completed ({completedCalls.length})</h4>
      <div class="tool-list">
        {#each completedCalls as toolCall}
          <ToolCallItem 
            toolCall={toolCall} 
            status={toolCall.status}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tool-panel {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    min-height: 200px;
  }
  
  .panel-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #94a3b8;
    font-size: 0.875rem;
  }
  
  .section {
    margin-bottom: 1rem;
  }
  
  .section-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }
  
  .tool-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
```

### Step 2: Create ToolCallItem.svelte

```svelte
<script lang="ts">
  import type { ToolCall } from '$lib/stores/builder.svelte';
  
  export let toolCall: ToolCall;
  export let status: 'running' | 'completed' | 'failed';
  
  // Status icons and colors
  const statusConfig = {
    running: { icon: '⏳', color: '#f59e0b', label: 'Running...' },
    completed: { icon: '✅', color: '#10b981', label: 'Completed' },
    failed: { icon: '❌', color: '#ef4444', label: 'Failed' }
  };
  
  $: config = statusConfig[status];
</script>

<div class="tool-call-item" class:running={status === 'running'}>
  <div class="tool-header">
    <div class="tool-icon" style="background: {config.color}">
      {#if status === 'running'}
        <div class="spinner"></div>
      {:else}
        {config.icon}
      {/if}
    </div>
    
    <div class="tool-info">
      <div class="tool-name">{toolCall.tool_name}</div>
      <div class="tool-status" style="color: {config.color}">
        {config.label}
      </div>
    </div>
  </div>
  
  {#if toolCall.args && Object.keys(toolCall.args).length > 0}
    <div class="tool-args">
      <div class="args-header">Parameters:</div>
      <pre class="args-content">{JSON.stringify(toolCall.args, null, 2)}</pre>
    </div>
  {/if}
  
  {#if status === 'completed' && toolCall.result}
    <div class="tool-result">
      <div class="result-header">Result:</div>
      <pre class="result-content">{JSON.stringify(toolCall.result, null, 2)}</pre>
    </div>
  {/if}
  
  {#if status === 'failed'}
    <div class="tool-error">
      {toolCall.error || 'Tool execution failed'}
    </div>
  {/if}
</div>

<style>
  .tool-call-item {
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    border-left: 3px solid #e2e8f0;
    transition: all 0.2s ease;
  }
  
  .tool-call-item.running {
    border-left-color: #f59e0b;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .tool-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .tool-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .tool-info {
    flex: 1;
  }
  
  .tool-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: #1e293b;
    font-family: monospace;
  }
  
  .tool-status {
    font-size: 0.75rem;
    margin-top: 0.125rem;
  }
  
  .tool-args {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: #f1f5f9;
    border-radius: 0.25rem;
  }
  
  .args-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.25rem;
  }
  
  .args-content {
    font-size: 0.75rem;
    color: #475569;
    margin: 0;
    overflow-x: auto;
    font-family: monospace;
  }
  
  .tool-result {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: #f0fdf4;
    border-left: 3px solid #10b981;
    border-radius: 0.25rem;
  }
  
  .result-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: #059669;
    margin-bottom: 0.25rem;
  }
  
  .result-content {
    font-size: 0.75rem;
    color: #047857;
    margin: 0;
    overflow-x: auto;
    font-family: monospace;
  }
  
  .tool-error {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: #fef2f2;
    border-left: 3px solid #ef4444;
    border-radius: 0.25rem;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>
```

### Step 3: Integration with BuilderChat

```svelte
<!-- In BuilderChat.svelte -->
<div class="chat-layout">
  <div class="chat-main">
    <!-- Messages -->
  </div>
  
  <div class="chat-sidebar">
    <AgentToolPanel />
  </div>
</div>
```

## خروجی قابل مشاهده
- کامپوننت AgentToolPanel ایجاد می‌شود
- Tool calls running با spinner نشان داده می‌شوند
- Tool calls completed با نتیجه نمایش داده می‌شوند
- Tool calls failed با خطا نمایش داده می‌شوند
- Auto-scroll به آخرین tool call

## معیارهای موفقیت
- [ ] کامپوننت‌ها بدون خطا compile می‌شوند
- [ ] Tool calls به درستی نمایش داده می‌شوند
- [ ] Running tools با animation نمایش داده می‌شوند
- [ ] Results به درستی فرمت می‌شوند
- [ ] Errors به درستی نمایش داده می‌شوند
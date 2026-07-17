# TASK 18_06: BuilderChat Component

## هدف
ایجاد کامپوننت چت اصلی برای تعامل کاربر با agent.

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/components/builder/BuilderChat.svelte` (CREATE)

## پیاده‌سازی

### Step 1: Create BuilderChat.svelte

```svelte
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import AgentPhaseIndicator from './AgentPhaseIndicator.svelte';
  import ToolCallItem from './ToolCallItem.svelte';
  
  let input = $state('');
  let chatContainer: HTMLElement;
  let textarea: HTMLTextAreaElement;
  
  // Auto-scroll to bottom when messages change
  $: if ($builderStore.messages.length && chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // Auto-resize textarea
  $: if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }
  
  async function handleSubmit() {
    if (!input.trim() || $builderStore.isLoading) return;
    
    const prompt = input.trim();
    input = '';
    
    // Reset textarea height
    if (textarea) {
      textarea.style.height = 'auto';
    }
    
    try {
      // Consume streaming packets
      for await (const packet of $builderStore.generateStream(prompt)) {
        // State updates handled by BuilderStore reactivity
        console.log('[BuilderChat] Packet:', packet.type);
      }
    } catch (err: any) {
      console.error('[BuilderChat] Error:', err);
    }
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }
  
  // Group messages by type for display
  $: messages = $builderStore.messages;
  $: toolCalls = $builderStore.activeToolCalls;
</script>

<div class="builder-chat">
  <!-- Header with phase indicator -->
  <div class="chat-header">
    <AgentPhaseIndicator />
  </div>
  
  <!-- Messages area -->
  <div class="chat-messages" bind:this={chatContainer}>
    {#if messages.length === 0}
      <div class="empty-chat">
        <div class="empty-icon">💬</div>
        <h3>Start Building</h3>
        <p>Describe the app you want to build and I'll help you create it.</p>
        <div class="suggestions">
          <button onclick={() => input = 'Create a counter app'}>
            Create a counter app
          </button>
          <button onclick={() => input = 'Build a todo list'}>
            Build a todo list
          </button>
          <button onclick={() => input = 'Make a weather dashboard'}>
            Make a weather dashboard
          </button>
        </div>
      </div>
    {/if}
    
    {#each messages as message}
      <div class="message {message.role}">
        <div class="message-avatar">
          {#if message.role === 'user'}
            👤
          {:else}
            🤖
          {/if}
        </div>
        
        <div class="message-content">
          <div class="message-header">
            <span class="message-author">
              {message.role === 'user' ? 'You' : 'Agent'}
            </span>
            <span class="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div class="message-text">
            {message.content}
          </div>
        </div>
      </div>
    {/each}
    
    <!-- Tool calls inline -->
    {#if toolCalls.length > 0}
      <div class="tool-calls-section">
        <h4>Running Tools</h4>
        {#each toolCalls as toolCall}
          <ToolCallItem {toolCall} status="running" />
        {/each}
      </div>
    {/if}
    
    <!-- Typing indicator -->
    {#if $builderStore.isLoading}
      <div class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span>Agent is thinking...</span>
      </div>
    {/if}
  </div>
  
  <!-- Input area -->
  <div class="chat-input-area">
    <div class="input-container">
      <textarea
        bind:value={input}
        bind:this={textarea}
        placeholder="Describe the app you want to build..."
        disabled={$builderStore.isLoading}
        onkeydown={handleKeyDown}
        rows={1}
      />
      
      <button 
        onclick={handleSubmit}
        disabled={!input.trim() || $builderStore.isLoading}
        class="send-button"
      >
        {#if $builderStore.isLoading}
          ⏳
        {:else}
          Send 🚀
        {/if}
      </button>
    </div>
    
    <div class="input-hint">
      Press Enter to send, Shift+Enter for new line
    </div>
  </div>
</div>

<style>
  .builder-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .chat-header {
    border-bottom: 1px solid #e2e8f0;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .empty-chat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #64748b;
    padding: 2rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .empty-chat h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #1e293b;
  }
  
  .empty-chat p {
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
  }
  
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }
  
  .suggestions button {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    color: #475569;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .suggestions button:hover {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .message {
    display: flex;
    gap: 0.75rem;
    max-width: 80%;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .message.user {
    align-self: flex-end;
    flex-direction: row-reverse;
  }
  
  .message.assistant {
    align-self: flex-start;
  }
  
  .message-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  
  .message-content {
    flex: 1;
  }
  
  .message-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  
  .message.user .message-header {
    justify-content: flex-end;
  }
  
  .message-author {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }
  
  .message-time {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  
  .message-text {
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .message.user .message-text {
    background: #3b82f6;
    color: white;
    border-bottom-right-radius: 0.25rem;
  }
  
  .message.assistant .message-text {
    background: #f1f5f9;
    color: #1e293b;
    border-bottom-left-radius: 0.25rem;
  }
  
  .tool-calls-section {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
  }
  
  .tool-calls-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }
  
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    color: #64748b;
    font-size: 0.875rem;
    font-style: italic;
  }
  
  .typing-dots {
    display: flex;
    gap: 0.25rem;
  }
  
  .typing-dots span {
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 50%;
    animation: typingBounce 1.4s ease-in-out infinite;
  }
  
  .typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-10px); }
  }
  
  .chat-input-area {
    padding: 1rem;
    border-top: 1px solid #e2e8f0;
    background: white;
  }
  
  .input-container {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }
  
  .input-container:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  textarea {
    flex: 1;
    padding: 0.5rem;
    border: none;
    background: transparent;
    resize: none;
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    min-height: 24px;
    max-height: 200px;
  }
  
  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .send-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .send-button:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .input-hint {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: #94a3b8;
  }
</style>
```

## خروجی قابل مشاهده
- کامپوننت BuilderChat ایجاد می‌شود
- UI پیام‌های کاربر و agent را نمایش می‌دهد
- Tool calls در کنار پیام‌ها نمایش داده می‌شوند
- Auto-scroll به آخرین پیام
- Rich text input (rich text input - optional)

## معیارهای موفقیت
- [ ] کامپونент compile می‌شود
- [ ] پیام‌ها به درستی نمایش داده می‌شوند
- [ ] Auto-scroll کار می‌کند
- [ ] Tool calls integrated
- [ ] Input auto-resize
- [ ] Keyboard shortcuts کار می‌کنند
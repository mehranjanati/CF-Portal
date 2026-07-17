# TASK 18_03: Agent Phase Indicator Component

## هدف
ایجاد کامپوننت UI برای نمایش فاز فعلی حلقه Agent (Planning → Executing → Observing)

## فایل‌های مورد نیاز
- `cloudflare/portal/src/lib/components/builder/AgentPhaseIndicator.svelte` (CREATE)
- `cloudflare/portal/src/lib/components/builder/AgentPhaseIcon.svelte` (NEW - optional)

## پیاده‌سازی

### Step 1: Create AgentPhaseIndicator.svelte

```svelte
<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  
  // Reactive phase and iteration from store
  $: phase = $builderStore.phase || 'idle';
  $: iteration = $builderStore.iteration || 0;
  $: maxIterations = $builderStore.maxIterations || 10;
  
  // Phase configuration
  const phaseConfig: Record<string, { icon: string; label: string; color: string }> = {
    planning: { icon: '📋', label: 'Planning', color: '#3b82f6' },
    executing: { icon: '⚙️', label: 'Executing', color: '#f59e0b' },
    observing: { icon: '👁️', label: 'Observing', color: '#8b5cf6' },
    completed: { icon: '✅', label: 'Completed', color: '#10b981' },
    failed: { icon: '❌', label: 'Failed', color: '#ef4444' },
    idle: { icon: '⏸️', label: 'Idle', color: '#94a3b8' }
  };
  
  // Get current phase config
  $: currentPhase = phaseConfig[phase] || phaseConfig.idle;
</script>

<div class="phase-indicator">
  <div class="phase-badge" style="background: {currentPhase.color}">
    <span class="icon">{currentPhase.icon}</span>
    <span class="label">{currentPhase.label}</span>
  </div>
  
  <div class="iteration-counter">
    Iteration {iteration} / {maxIterations}
  </div>
  
  {#if phase === 'planning' && $builderStore.agentLoopState?.currentPlan}
    <div class="plan-preview">
      <div class="plan-header">📝 Plan:</div>
      <ul class="plan-steps">
        {#each $builderStore.agentLoopState.currentPlan.steps as step, index}
          <li class="plan-step">
            <span class="step-number">{index + 1}</span>
            <span class="step-description">{step.description}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  {#if phase === 'executing'}
    <div class="execution-progress">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          style="width: {$builderStore.executionProgress || 0}%"
        />
      </div>
      <span class="progress-text">
        Executing tool: {$builderStore.currentTool || 'Unknown'}
      </span>
    </div>
  {/if}
</div>

<style>
  .phase-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .phase-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s ease;
  }
  
  .icon {
    font-size: 1.25rem;
  }
  
  .iteration-counter {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }
  
  .plan-preview {
    flex: 1;
    margin-left: 1rem;
    padding: 0.5rem;
    background: #f1f5f9;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .plan-header {
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.25rem;
  }
  
  .plan-steps {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .plan-step {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: #64748b;
  }
  
  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .step-description {
    flex: 1;
  }
  
  .execution-progress {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .progress-bar {
    flex: 1;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #f59e0b;
    transition: width 0.3s ease;
  }
  
  .progress-text {
    font-size: 0.875rem;
    color: #64748b;
  }
</style>
```

### Step 2: Integration with BuilderStore

```typescript
// In builder.svelte.ts, add phase tracking
interface BuilderStoreState {
  // ... existing state
  phase: AgentPhase;
  iteration: number;
  maxIterations: number;
  agentLoopState?: {
    currentPlan?: ExecutionPlan;
    lastResult?: ExecutionResult;
    observation?: Observation;
  };
  executionProgress?: number;
  currentTool?: string;
}

// Update when state_sync packet received
case 'state_sync':
  if (packet.payload.status) {
    this.phase = packet.payload.status;
  }
  if (packet.payload.iteration) {
    this.iteration = packet.payload.iteration;
  }
  if (packet.payload.state?.currentPlan) {
    this.agentLoopState = {
      ...this.agentLoopState,
      currentPlan: packet.payload.state.currentPlan
    };
  }
  break;
```

## خروجی قابل مشاهده
- کامپوننت AgentPhaseIndicator ایجاد می‌شود
- فاز فعلی agent با آیکون و رنگ نمایش داده می‌شود
- iteration counter نمایش داده می‌شود
- در فاز Planning، مراحل plan نمایش داده می‌شوند
- در فاز Executing، progress bar نمایش داده می‌شود

## معیارهای موفقیت
- [ ] کامپوننت بدون خطا compile می‌شود
- [ ] فazها به درستی نمایش داده می‌شوند
- [ ] Phase transitions به صورت animated است
- [ ] Plan steps در فاز Planning نمایش داده می‌شوند
- [ ] Progress indicator در فاز Executing کار می‌کند
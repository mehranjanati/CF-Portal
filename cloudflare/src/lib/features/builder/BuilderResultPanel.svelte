<script lang="ts">
  import { builderStore } from '$lib/stores/builder.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BuilderFilePlan from './BuilderFilePlan.svelte';
  import { Sparkles, Loader2, AlertCircle, ArrowRight, GitBranch, Rocket, FileText } from 'lucide-svelte';

  function handleRetry() {
    if (builderStore.session?.intent) {
      builderStore.createSession(
        builderStore.session.tenantId,
        builderStore.session.appId,
        builderStore.session.template,
        builderStore.session.intent
      );
    }
  }
</script>

<div class="flex-1 overflow-y-auto bg-bg-primary p-6 lg:p-10">
  {#if !builderStore.session}
    <div class="h-full flex items-center justify-center">
      <div class="max-w-md w-full">
        <EmptyState 
          title="Ready to Build?"
          description="Select a template and describe your vision in the left panel to start generating your application architecture."
          icon={Sparkles}
        />
      </div>
    </div>
  {:else if builderStore.session.status === 'generating' || builderStore.isLoading}
    <div class="h-full flex flex-col items-center justify-center space-y-6">
      <div class="relative">
        <div class="w-20 h-20 border-4 border-white/5 rounded-full"></div>
        <div class="w-20 h-20 border-4 border-transparent border-t-accent-primary rounded-full animate-spin absolute top-0 left-0"></div>
        <Sparkles class="w-8 h-8 text-accent-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div class="text-center space-y-2">
        <h3 class="text-xl font-bold text-text-primary">Architecting your App...</h3>
        <p class="text-sm text-text-muted max-w-xs mx-auto">Our AI is designing the file structure and generating the initial code based on your requirements.</p>
      </div>
    </div>
  {:else if builderStore.result}
    <div class="space-y-10 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-end border-b border-white/5 pb-6">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold text-text-primary">Generation Result</h2>
          <p class="text-sm text-text-muted">Review the generated architecture and proposed changes.</p>
        </div>
        <div class="flex gap-3">
          <Button variant="secondary" size="sm" class="gap-2 bg-white/5 border-white/10 hover:bg-white/10">
            <GitBranch class="w-4 h-4" />
            Save Draft
          </Button>
          <div class="relative group">
            <Button variant="primary" size="sm" class="gap-2 bg-accent-primary text-bg-primary hover:bg-accent-primary/90 opacity-50 cursor-not-allowed">
              <Rocket class="w-4 h-4" />
              Publish to CF
            </Button>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-bg-tertiary text-text-primary text-[10px] rounded border border-white/10 shadow-xl text-center z-50">
              Publishing is coming soon. For now, you can review and save drafts.
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <section class="bg-bg-secondary p-6 rounded-2xl border border-white/5 shadow-sm space-y-4">
        <div class="flex items-center gap-2 text-accent-primary">
          <Sparkles class="w-5 h-5" />
          <h3 class="text-sm font-bold uppercase tracking-wider">Summary</h3>
        </div>
        <p class="text-text-muted leading-relaxed">{builderStore.result.summary}</p>
      </section>

      <!-- File Plan Section -->
      <BuilderFilePlan files={builderStore.result.files} />

      <!-- Next Actions -->
      <section class="space-y-4">
        <h3 class="text-sm font-bold uppercase tracking-wider text-text-muted">Suggested Next Steps</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each builderStore.result.nextActions as action}
            <div class="flex items-center justify-between p-4 bg-bg-secondary border border-white/5 rounded-xl hover:border-accent-primary/50 hover:shadow-md transition-all group cursor-pointer">
              <span class="text-sm font-medium text-text-primary">{action}</span>
              <ArrowRight class="w-4 h-4 text-text-muted group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
            </div>
          {/each}
        </div>
      </section>
    </div>
  {:else if builderStore.session.status === 'failed'}
    <div class="h-full flex items-center justify-center">
      <div class="max-w-md w-full text-center space-y-6">
        <div class="mx-auto w-16 h-16 bg-status-danger/10 rounded-full flex items-center justify-center">
          <AlertCircle class="w-8 h-8 text-status-danger" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-bold text-text-primary">Generation Failed</h3>
          <p class="text-sm text-text-muted">{builderStore.error || "Something went wrong while communicating with the AI provider."}</p>
        </div>
        <Button variant="primary" onclick={handleRetry} class="gap-2 bg-accent-primary text-bg-primary">
          <Loader2 class="w-4 h-4" />
          Retry Generation
        </Button>
      </div>
    </div>
  {:else}
    <div class="h-full flex items-center justify-center">
      <EmptyState 
        title="Waiting for Prompt"
        description="Your session is initialized. Enter a prompt in the left panel to start generating code."
        icon={FileText}
      />
    </div>
  {/if}
</div>

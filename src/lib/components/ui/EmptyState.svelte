<script lang="ts">
    import { FolderPlus } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';

    let {
        icon: Icon = FolderPlus,
        title = 'No items found',
        description = 'Get started by creating your first item.',
        actionLabel = 'Create Item',
        onAction = () => {}
    } = $props();
</script>

<div class="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
    <Icon class="h-12 w-12 text-white/10 mb-4" />
    <h3 class="text-lg font-bold text-text-primary">{title}</h3>
    <p class="text-text-muted text-sm mt-1 text-center max-w-sm">{description}</p>
    {#if actionLabel}
        <Button variant="outline" class="mt-6 border-white/10" onclick={onAction}>
            {actionLabel}
        </Button>
    {/if}
</div>

<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { CheckCircle2, AlertCircle, X, Info } from 'lucide-svelte';

    export type ToastType = 'success' | 'error' | 'info';

    interface Props {
        message: string;
        type?: ToastType;
        duration?: number;
        onClose: () => void;
    }

    let { message, type = 'info', duration = 3000, onClose }: Props = $props();

    onMount(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    });
</script>

<div
    class="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-lg shadow-lg border min-w-[300px] text-white border-white/20"
    class:bg-green-500={type === 'success'}
    class:bg-red-500={type === 'error'}
    class:bg-blue-500={type === 'info'}
    transition:slide={{ axis: 'y' }}
>
    <div class="mr-3">
        {#if type === 'success'}
            <CheckCircle2 class="h-5 w-5" />
        {:else if type === 'error'}
            <AlertCircle class="h-5 w-5" />
        {:else}
            <Info class="h-5 w-5" />
        {/if}
    </div>
    
    <div class="flex-1 text-sm font-medium">
        {message}
    </div>

    <button 
        onclick={onClose}
        class="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
    >
        <X class="h-4 w-4" />
    </button>
</div>

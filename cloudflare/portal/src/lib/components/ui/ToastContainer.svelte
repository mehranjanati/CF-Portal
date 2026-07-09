<script lang="ts">
    import { toast } from '$lib/stores/toast';
    import Toast from '$lib/components/ui/Toast.svelte';
    import { flip } from 'svelte/animate';
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {#each $toast as t (t.id)}
        <div animate:flip={{ duration: 200 }}>
            <Toast 
                message={t.message} 
                type={t.type} 
                duration={t.duration} 
                onClose={() => toast.remove(t.id)} 
            />
        </div>
    {/each}
</div>

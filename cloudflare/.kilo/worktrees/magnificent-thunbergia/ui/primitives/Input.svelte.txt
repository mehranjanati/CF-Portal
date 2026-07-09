<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        class: className = "",
        type = "text",
        value = $bindable(),
        ...rest
    } = $props();
</script>

<input
    {type}
    class={cn(
        "flex h-10 w-full rounded-button bg-bg-secondary border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary/20 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
    )}
    {...rest}
/>

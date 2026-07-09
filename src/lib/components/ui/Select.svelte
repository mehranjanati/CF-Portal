<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        class: className = "",
        value = $bindable(),
        options = [],
        placeholder = "Select an option...",
        ...rest
    } = $props();

    interface Option {
        label: string;
        value: string;
    }
</script>

<div class="relative">
    <select
        bind:value
        class={cn(
            "flex h-10 w-full rounded-button bg-bg-secondary border border-white/10 px-3 py-2 text-sm text-text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary/20 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
            className,
        )}
        {...rest}
    >
        <option value="" disabled selected>{placeholder}</option>
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted"
    >
        <svg
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
        >
    </div>
</div>

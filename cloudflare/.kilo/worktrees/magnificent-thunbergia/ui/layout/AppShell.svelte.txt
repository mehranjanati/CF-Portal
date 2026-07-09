<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import Topbar from "$lib/components/layout/Topbar.svelte";
    import GlobalChat from "$lib/components/chat/GlobalChat.svelte";
    import { cn } from "$lib/utils";

    let { children } = $props();
    let collapsed = $state(false);
</script>

<div
    class="flex h-screen w-full bg-bg-primary text-text-primary font-sans overflow-hidden"
>
    <!-- Sidebar -->
    <Sidebar bind:collapsed />

    <!-- Main Content -->
    <div
        class={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
            collapsed ? "ml-[72px]" : "ml-[280px]",
        )}
    >
        <Topbar bind:collapsed />

        <main class="flex-1 overflow-y-auto overflow-x-hidden relative p-6">
            {@render children()}
        </main>
    </div>
    
    <!-- Global Chat Widget -->
    <GlobalChat />
</div>

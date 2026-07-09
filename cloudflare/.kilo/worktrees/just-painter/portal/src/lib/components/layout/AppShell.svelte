<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import Topbar from "$lib/components/layout/Topbar.svelte";

    let { children } = $props();
    let collapsed = $state(false);
    
    function cn(...classes: (string | undefined | null | false)[]) {
        return classes.filter(Boolean).join(' ');
    }
</script>

<div
    class="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden"
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
</div>

<script lang="ts">
    import { appHashToPageName, currentAppHash } from "$lib/utils";
    import {
        Search,
        Bell,
        Menu,
        User,
        ChevronDown,
        Sun,
        Moon,
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { onMount } from "svelte";
    import { workspace } from "$lib/stores/workspace.svelte";

    let { collapsed = $bindable() } = $props();
    let currentHash = $state("#/");
    let isDark = $state(true);

    onMount(() => {
        const updateHash = () => {
            currentHash = window.location.hash || "#/";
        };
        updateHash();
        window.addEventListener("hashchange", updateHash);
    });

    const pageTitle = $derived(appHashToPageName(currentHash));
</script>

<header
    class="h-16 border-b border-white/5 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-6 justify-between"
>
    <div class="flex items-center gap-6">
        <button
            class="lg:hidden p-2 -ml-2 text-text-muted hover:text-text-primary"
            onclick={() => (collapsed = !collapsed)}
        >
            <Menu size={20} />
        </button>

        <button
            class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/50 border border-white/5 hover:bg-bg-secondary transition-colors group"
        >
            <div
                class="w-5 h-5 rounded bg-accent-secondary/20 flex items-center justify-center font-bold text-lg shrink-0"
            >
                N
            </div>
            <span class="text-sm font-medium text-text-primary"
                >{workspace.state.tenant?.name || 'Nexus'}</span
            >
            <ChevronDown
                size={14}
                class="text-text-muted group-hover:text-text-primary transition-colors"
            />
        </button>

        <div class="h-4 w-px bg-white/10 hidden md:block"></div>

        <nav
            class="hidden sm:flex items-center text-xs font-mono text-text-muted"
        >
            <span
                class="hover:text-text-primary cursor-pointer transition-colors"
                >{workspace.state.tenant?.name || 'Nexus'}</span
            >
            <span class="mx-2 text-white/10">/</span>
            <span class="text-text-primary capitalize">{pageTitle}</span>
        </nav>
    </div>

    <div class="flex-1 max-w-lg px-4 hidden lg:block">
        <div class="relative group">
            <Search
                class="absolute left-3 top-2.5 h-4 w-4 text-text-muted group-focus-within:text-accent-primary transition-colors"
            />
            <Input
                placeholder="Search agents, logs, flows... (Cmd+K)"
                class="pl-10 bg-bg-secondary/40 border-white/5 focus:bg-bg-secondary/80 focus:border-accent-primary/20 transition-all"
            />
        </div>
    </div>

    <div class="flex items-center gap-2">
        <Button
            variant="ghost"
            size="icon"
            class="text-text-muted hover:text-text-primary relative h-9 w-9"
        >
            <Bell size={18} />
            <span
                class="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-status-danger border-2 border-bg-primary"
            ></span>
        </Button>

        <Button
            variant="ghost"
            size="icon"
            class="text-text-muted hover:text-text-primary h-9 w-9"
            onclick={() => (isDark = !isDark)}
        >
            {#if isDark}
                <Moon size={18} />
            {:else}
                <Sun size={18} />
            {/if}
        </Button>

        <div class="h-6 w-px bg-white/5 mx-2"></div>

        <button
            class="flex items-center gap-2 group p-0.5 rounded-full hover:bg-white/5 transition-colors"
        >
            <div
                class="h-8 w-8 rounded-full bg-gradient-to-tr from-bg-tertiary to-bg-primary border border-white/10 flex items-center justify-center text-text-primary group-hover:border-accent-primary/30 transition-colors shadow-inner"
            >
                <User size={16} class="text-text-muted" />
            </div>
        </button>
    </div>
</header>

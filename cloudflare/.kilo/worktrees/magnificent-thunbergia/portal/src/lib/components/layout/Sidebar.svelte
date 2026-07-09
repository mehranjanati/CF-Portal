<script lang="ts">
    import { cn, normalizeAppHash } from "$lib/utils";
    import { page } from "$app/stores";
    import { workspace } from "$lib/stores/workspace.svelte";
    // import { isFeatureEnabled } from "$lib/featureFlags";
    import {
        LayoutGrid,
        Cpu,
        Workflow,
        Rocket,
        Terminal,
        Phone,
        Settings,
        FolderPlus,
        Blocks,
        CreditCard,
        ChevronLeft,
        ChevronRight,
        LogOut,
        User,
        ShoppingBag,
        ChevronDown,
    } from "lucide-svelte";

    let { collapsed = $bindable(false) } = $props();

    const navigation = $derived([
        { label: "Overview", icon: LayoutGrid, route: workspace.state.activeTenantId ? `/workspace/${workspace.state.activeTenantId}` : '/workspace' },
        { label: "Projects", icon: FolderPlus, route: "/projects" },
        { label: "Builder", icon: Blocks, route: "/builder" },
        { label: "Workflows", icon: Workflow, route: "#", gated: true },
        { label: "Deployments", icon: Rocket, route: "#", gated: true },
        { label: "Integrations", icon: Blocks, route: "/settings/integrations" },
    ]);

    function toggleCollapse() {
        collapsed = !collapsed;
    }

    function isRouteActive(route: string) {
        return $page.url.pathname === route || $page.url.pathname.startsWith(route + '/');
    }
</script>

<aside
    class={cn(
        "flex flex-col border-r border-white/5 bg-bg-secondary transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-40",
        collapsed ? "w-[72px]" : "w-[280px]",
    )}
>
    <div class="h-16 flex items-center px-4 border-b border-white/5">
        <div
            class="h-8 w-8 rounded-lg bg-accent-secondary/20 text-accent-secondary flex items-center justify-center font-bold text-lg shrink-0"
        >
            N
        </div>
        {#if !collapsed}
            <span
                class="ml-3 font-semibold tracking-wide text-text-primary whitespace-nowrap overflow-hidden"
                >NEXUS PORTAL</span
            >
        {/if}
    </div>

    <!-- Workspace Switcher -->
    <div class="px-3 py-4 border-b border-white/5">
        <a 
            href="/workspace" 
            class={cn(
                "flex items-center p-2 rounded-lg hover:bg-white/5 transition-all group",
                collapsed ? "justify-center" : "space-x-3"
            )}
        >
            <div class="h-8 w-8 rounded-md bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-white/20">
                <LayoutGrid class="h-4 w-4 text-text-muted" />
            </div>
            {#if !collapsed}
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-text-primary truncate">
                        {workspace.state.tenant?.name || 'No Workspace'}
                    </p>
                    <p class="text-[10px] text-text-muted truncate">
                        Switch Workspace
                    </p>
                </div>
                <ChevronDown class="h-3 w-3 text-text-muted" />
            {/if}
        </a>
    </div>

    <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {#each navigation as item}
            <a
                href={item.route}
                class={cn(
                    "flex items-center px-3 py-2.5 rounded-button transition-all group relative",
                    isRouteActive(item.route)
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-muted hover:text-text-primary hover:bg-white/5",
                    item.gated ? "opacity-60 cursor-not-allowed" : ""
                )}
                onclick={item.gated ? (e) => e.preventDefault() : undefined}
                title={collapsed ? item.label : undefined}
            >
                <item.icon
                    class={cn(
                        "h-5 w-5 shrink-0",
                        isRouteActive(item.route)
                            ? "text-accent-primary"
                            : "text-text-muted group-hover:text-text-primary",
                    )}
                />

                {#if !collapsed}
                    <span
                        class="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden flex-1"
                        >{item.label}</span
                    >
                    {#if item.gated}
                        <span class="text-[8px] font-bold bg-white/10 text-text-muted px-1 py-0.5 rounded uppercase tracking-tighter">Soon</span>
                    {/if}
                {/if}

                {#if isRouteActive(item.route) && !collapsed && !item.gated}
                    <div
                        class="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(0,255,157,0.5)]"
                    ></div>
                {/if}
            </a>
        {/each}
    </nav>

    <div class="p-3 border-t border-white/5">
        <button
            class={cn(
                "flex items-center w-full p-2 rounded-button hover:bg-white/5 transition-colors text-left",
                collapsed ? "justify-center" : "",
            )}
        >
            <div
                class="h-8 w-8 rounded-full bg-gradient-to-tr from-bg-tertiary to-bg-primary border border-white/10 shrink-0 flex items-center justify-center text-text-muted"
            >
                <User size={16} />
            </div>

            {#if !collapsed}
                <div class="ml-3 overflow-hidden">
                    <p class="text-xs font-medium text-text-primary truncate">
                        Admin User
                    </p>
                    <p class="text-[10px] text-text-muted truncate">
                        Super Admin
                    </p>
                </div>
                <LogOut
                    class="ml-auto h-4 w-4 text-text-muted hover:text-status-danger transition-colors"
                />
            {/if}
        </button>
    </div>

    <button
        onclick={toggleCollapse}
        class="absolute -right-3 top-20 h-6 w-6 rounded-full bg-bg-tertiary border border-white/10 flex items-center justify-center text-text-muted hover:text-accent-primary hover:border-accent-primary/50 transition-all z-50 focus:outline-none"
    >
        {#if collapsed}
            <ChevronRight size={14} />
        {:else}
            <ChevronLeft size={14} />
        {/if}
    </button>
</aside>

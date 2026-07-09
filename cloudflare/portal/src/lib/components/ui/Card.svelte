<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        children,
        class: className = "",
        variant = "default",
        ...rest
    } = $props();

    const variants = {
        default: "bg-bg-secondary border border-white/5",
        glass: "bg-bg-secondary/50 backdrop-blur-md border border-white/5",
        outline: "bg-transparent border border-white/10",
        gradient:
            "bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-white/5",
    };
</script>

<div
    class={cn(
        "rounded-card shadow-card overflow-hidden transition-all duration-300",
        variants[variant as keyof typeof variants],
        className,
    )}
    {...rest}
>
    {@render children()}
</div>

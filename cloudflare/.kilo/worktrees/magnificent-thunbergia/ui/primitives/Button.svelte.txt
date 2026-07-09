<script lang="ts">
	import { cn } from "$lib/utils";

	let {
		children,
		class: className = "",
		variant = "default",
		size = "default",
		disabled = false,
		loading = false,
		...rest
	} = $props();

	const variants = {
		default:
			"bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-white/10",
		primary:
			"bg-accent-primary text-bg-primary hover:bg-accent-primary/90 font-semibold shadow-[0_0_15px_rgba(0,255,157,0.3)]",
		secondary:
			"bg-accent-secondary text-white hover:bg-accent-secondary/90",
		outline: "bg-transparent border border-white/20 hover:bg-white/5",
		ghost: "bg-transparent hover:bg-white/5",
		danger: "bg-status-danger/10 text-status-danger border border-status-danger/20 hover:bg-status-danger/20",
	};

	const sizes = {
		sm: "h-8 px-3 text-xs",
		default: "h-10 px-4 py-2",
		lg: "h-12 px-8 text-lg",
		icon: "h-10 w-10 p-0 flex items-center justify-center",
	};
</script>

<button
	class={cn(
		"inline-flex items-center justify-center rounded-button font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
		variants[variant as keyof typeof variants],
		sizes[size as keyof typeof sizes],
		className,
	)}
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<svg
			class="animate-spin -ml-1 mr-2 h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{@render children()}
</button>

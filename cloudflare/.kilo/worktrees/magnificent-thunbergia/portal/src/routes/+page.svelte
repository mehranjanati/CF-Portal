<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    // در معماری SPA ما SSR را خاموش کردیم، بنابراین ریدایرکت سرورساید کار نمی‌کند
    // این ریدایرکت کلاینت‌ساید باعث می‌شود کاربر به محض ورود به داشبورد منتقل شود
    onMount(() => {
        goto('/projects');
    });
</script>

<div class="flex items-center justify-center h-full w-full">
    <div class="animate-pulse text-gray-500">
        Redirecting to dashboard...
    </div>
</div>

import { redirect } from '$app/navigation';

export function load() {
    throw redirect(307, 'https://svelte.dev/docs/ai/overview');
}
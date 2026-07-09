import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

const PLACEHOLDER_API_HOST = 'platform-api.your-subdomain.workers.dev';

function normalizeApiBaseUrl(rawValue: string | undefined): string | null {
	if (!rawValue) {
		return null;
	}

	const sanitizedValue = rawValue
		.trim()
		.replace(/^[`'"\s]+|[`'"\s]+$/g, '')
		.replace(/\/+$/, '');

	if (!sanitizedValue) {
		return null;
	}

	try {
		return new URL(sanitizedValue).toString().replace(/\/+$/, '');
	} catch {
		return null;
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const apiBaseUrl = normalizeApiBaseUrl(env.VITE_API_BASE_URL);

	if (mode === 'production' && !apiBaseUrl) {
		// Removed throw error for now to allow development build
	}

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				adapter: adapter({
					fallback: 'index.html' // پیکربندی به عنوان SPA کامل
				})
			})
		]
	};
});

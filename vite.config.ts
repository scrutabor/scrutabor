import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

			serviceWorker: {
				// Registered by src/routes/app/+layout.svelte with scope /app/,
				// so the worker serves the book and never the landing pages.
				// The framework's own registration knows no scope.
				register: false
			}
		})
	],
	build: {
		// Keep font files as files. Vite inlines assets under 4 KB as data
		// URIs, which for the small Greek ranges means every page carries
		// them in its stylesheet whether or not it sets a Greek word.
		// false = never inline; undefined = leave the default limit alone.
		assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined)
	},
	test: {
		// scripts too: a build script that does the wrong thing on the
		// production branch is not something to find out about afterwards
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
		environment: 'node'
	}
});

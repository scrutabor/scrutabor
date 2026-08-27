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

			typescript: {
				// The offline runtime and the build scripts' tests are code
				// like any other and were the only code no type-checker read:
				// a planted `const wrong: number = 'x'` in offline/routes.ts
				// passed `npm run check` clean, because the generated include
				// covers src/ and tests/ alone. The runtime that renders the
				// whole downloaded book does not get to be the exception.
				config: (config) => {
					config.include.push('../offline/**/*.ts', '../scripts/**/*.ts');
				}
			},

			serviceWorker: {
				// Registered by src/routes/app/+layout.svelte with scope /app/,
				// so the worker serves the book and never the landing pages.
				// The framework's own registration knows no scope.
				register: false
			}
		}),
		{
			name: 'name-lazy-corpus-chunks',
			apply: 'build',
			outputOptions(options) {
				// Candidate texts and language resources are genuine lazy entry
				// points. Give their JSON facades a stable directory boundary so
				// the service worker can keep them out of a first web visit while
				// still packaging every one for an installed book.
				options.chunkFileNames = (chunk) => {
					const facade = chunk.facadeModuleId?.split('?')[0];
					// The search module eagerly folds the neutral concordance into
					// its own chunk, so its facade is a .ts file — and missing it
					// here put half a megabyte of index into every first visit's
					// shell precache. The boundary is the data, not the extension.
					const corpusResource =
						(facade?.includes('/src/lib/data/') && facade.endsWith('.json')) ||
						facade?.endsWith('/src/lib/search.ts');
					return corpusResource
						? '_app/immutable/corpus/[name].[hash].js'
						: '_app/immutable/chunks/[name].[hash].js';
				};
			}
		}
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

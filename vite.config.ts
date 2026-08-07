import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { createReadStream, existsSync, statSync } from 'node:fs';

// Production serves build/, where build:site places the offline zip
// beside the pages; SvelteKit's preview serves its own output manifest
// and has never heard of that file. This teaches the preview the one
// artifact the adapter did not emit, so the e2e suite can assert the
// landing's download link against a real 200 — as a reader would get it.
const offlineZipInPreview: Plugin = {
	name: 'scrutabor:offline-zip-in-preview',
	configurePreviewServer(server) {
		server.middlewares.use('/Scrutabor.zip', (_req, res, next) => {
			const zip = 'build/Scrutabor.zip';
			if (!existsSync(zip)) return next();
			res.setHeader('Content-Type', 'application/zip');
			res.setHeader('Content-Length', statSync(zip).size);
			createReadStream(zip).pipe(res);
		});
	}
};

export default defineConfig({
	plugins: [
		offlineZipInPreview,
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
			},

			prerender: {
				// The one link the crawler may not resolve: the offline zip is
				// built FROM the finished site (build:site) and copied in
				// beside it, so at prerender time the file cannot exist yet.
				// Anything else missing still fails the build.
				handleHttpError: ({ path, referrer, message }) => {
					if (path === '/Scrutabor.zip') return;
					throw new Error(referrer ? `${message} (linked from ${referrer})` : message);
				}
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

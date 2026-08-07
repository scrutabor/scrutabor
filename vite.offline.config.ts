// The runtime for a downloaded copy of the book.
//
// One classic script, built from the SAME source as the site, that starts a
// page without SvelteKit's router (see src/offline.ts for why the router
// cannot be used). It is a separate Vite build rather than a transform over
// the finished one, so that this bundle and the app's components are
// compiled together and share one Svelte runtime — two copies of it would
// hydrate into two different component trees and neither would work.
//
// `format: 'iife'` is the point of the whole file: an ES module cannot be
// loaded from file://, and a classic script can.
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: { runes: true },
			// the generated root component lives outside src
			extensions: ['.svelte']
		})
	],
	resolve: {
		alias: {
			$lib: here('./src/lib'),
			// SvelteKit's virtual modules are the router's own surface, and
			// there is no router here. Each shim is an explicit answer to
			// "what happens instead" — see src/offline-shims.
			'$app/environment': here('./offline/shims/environment.ts'),
			'$app/env': here('./offline/shims/environment.ts'),
			'$app/navigation': here('./offline/shims/navigation.ts'),
			'$app/state': here('./offline/shims/state.ts'),
			'$app/stores': here('./offline/shims/state.ts')
		}
	},
	build: {
		outDir: 'build-offline-runtime',
		emptyOutDir: true,
		// The opposite of the site's rule. This bundle injects its own copy
		// of the stylesheet, and a `url()` inside an injected <style> resolves
		// against the DOCUMENT — so a relative path would mean something
		// different on every page depth. Inlined, the reading face cannot be
		// looked for in the wrong place.
		assetsInlineLimit: () => true,
		rollupOptions: {
			input: here('./offline/entry.ts'),
			output: {
				format: 'iife',
				entryFileNames: 'offline.js',
				assetFileNames: '[name][extname]',
				inlineDynamicImports: true
			}
		}
	}
});

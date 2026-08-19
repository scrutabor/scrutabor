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
			// BEFORE $lib, and that is not cosmetic: Vite takes the first alias
			// whose prefix matches, so `$lib` listed first would swallow this
			// one and the copy would quietly keep the site's stub — which it
			// did, and the day then tried to fetch itself off a disk.
			//
			// Not a SvelteKit module: the one place where the copy answers a
			// question the site sends over a transport. See the stub's comment.
			'$lib/proper-local': here('./offline/shims/proper-local.ts'),
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
		// The opposite of the site's rule. Every asset is inlined, so the
		// reading face travels inside the stylesheet as a data URI and cannot
		// be looked for in the wrong place — which under file://, where a
		// page's own location is wherever the reader unzipped the book, is
		// the only way it is certain to be found at all.
		assetsInlineLimit: () => true,
		// ONE stylesheet, written as a file, and the shell links it.
		// Code-split CSS is injected by the runtime instead, which means the
		// document computes its styles once with the browser's own defaults
		// and again when the script has run — and `body` carries a quarter
		// second `color` transition for the theme toggle, so every page in
		// the downloaded copy opened by fading up from black. It cost nothing
		// on the site, where the stylesheet is a link in the head, and it was
		// invisible in the old folder edition for the same reason.
		cssCodeSplit: false,
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

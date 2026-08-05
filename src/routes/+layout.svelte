<script lang="ts">
	// Our own subsets of EB Garamond, cut to the characters this edition
	// sets (scripts/subset-fonts.py). Upstream ships every script it
	// covers, which cost a reader 288K of font on every page.
	import '$lib/fonts/fonts.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// Preloaded so the reading face is in flight before the CSS is parsed
	// — together with the metric-matched fallback in app.css this removes
	// the first-load font flicker. BOTH latin ranges: Polish diacritics and
	// Latin's ǽ live in latin-ext, so leaving it to be discovered means a
	// second swap, later, and a second layout shift. It costs 24K now that
	// the faces are subsets (it was 198K before). Greek stays on demand:
	// only a handful of pages set a Greek word.
	import ebLatin from '$lib/fonts/eb-garamond-latin-wght-normal.woff2?url';
	import ebLatinExt from '$lib/fonts/eb-garamond-latin-ext-wght-normal.woff2?url';
	import ebLatinItalic from '$lib/fonts/eb-garamond-latin-wght-italic.woff2?url';
	import ebLatinExtItalic from '$lib/fonts/eb-garamond-latin-ext-wght-italic.woff2?url';

	let { children } = $props();

	// Marks the moment the page becomes interactive. The prerendered HTML is
	// readable long before the corpus bundle has hydrated it, so a tap on a
	// word can land while nothing is listening yet — this says when that
	// stops being true, for tests and for any styling that wants to wait.
	$effect(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	// The offline promise belongs to the installed app, not to a first web
	// visit: when the browser reports an install, tell the worker to fetch
	// the whole book. Someone who opened one prayer never pays for a missal.
	$effect(() => {
		// `ready`, not `controller`: a worker that has just installed is not
		// yet controlling this page, and that is exactly when an install
		// happens.
		const ask = () =>
			navigator.serviceWorker?.ready.then((r) => r.active?.postMessage('cache-the-book'));
		const onInstalled = () => ask();
		addEventListener('appinstalled', onInstalled);
		// Already installed and merely reopened: ask again; the worker only
		// fetches what it is missing.
		if (matchMedia('(display-mode: standalone)').matches) ask();
		return () => removeEventListener('appinstalled', onInstalled);
	});

	const fonts = [ebLatin, ebLatinExt, ebLatinItalic, ebLatinExtItalic];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icon-192.png" />
	{#each fonts as href (href)}
		<link rel="preload" as="font" type="font/woff2" {href} crossorigin="anonymous" />
	{/each}
</svelte:head>

{@render children()}

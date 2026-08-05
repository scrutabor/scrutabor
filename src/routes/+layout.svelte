<script lang="ts">
	import '@fontsource-variable/eb-garamond';
	import '@fontsource-variable/eb-garamond/wght-italic.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// Preloaded so the reading face (roman + italic; Polish needs
	// latin-ext) is in flight before the CSS is parsed — together with
	// the metric-matched fallback in app.css this removes the
	// first-load font flicker.
	import ebLatin from '@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2?url';
	import ebLatinExt from '@fontsource-variable/eb-garamond/files/eb-garamond-latin-ext-wght-normal.woff2?url';
	import ebLatinItalic from '@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2?url';
	import ebLatinExtItalic from '@fontsource-variable/eb-garamond/files/eb-garamond-latin-ext-wght-italic.woff2?url';

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

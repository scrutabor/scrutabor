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

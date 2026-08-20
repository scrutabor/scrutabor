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

	let { children } = $props();

	// Marks the moment the page becomes interactive. The prerendered HTML is
	// readable long before the corpus bundle has hydrated it, so a tap on a
	// word can land while nothing is listening yet — this says when that
	// stops being true, for tests and for any styling that wants to wait.
	$effect(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	const fonts = [ebLatin, ebLatinExt];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#each fonts as href (href)}
		<link rel="preload" as="font" type="font/woff2" {href} crossorigin="anonymous" />
	{/each}
</svelte:head>

{@render children()}

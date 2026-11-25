<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import { ORIGIN } from '$lib/site';
	import { adoptLanguage } from '$lib/where.svelte';

	let { children, data } = $props();

	// From the layout's own load, not from the router: see +layout.ts.
	const lang = $derived(data.lang as Lang);
	const rest = $derived(data.path);
	const languages = $derived(data.languages as Lang[]);
	const fallback = $derived(languages.includes('en') ? 'en' : languages[0]);

	$effect(() => {
		adoptLanguage(lang, rest, languages);
	});
</script>

<svelte:head>
	<link rel="canonical" href="{ORIGIN}/app/{lang}{rest}" />
	{#each languages as language (language)}
		<link rel="alternate" hreflang={language} href="{ORIGIN}/app/{language}{rest}" />
	{/each}
	<link rel="alternate" hreflang="x-default" href="{ORIGIN}/app/{fallback}{rest}" />
	<meta property="og:site_name" content="Scrutabor" />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={lang === 'pl' ? 'pl_PL' : 'en_US'} />
	<meta property="og:image" content="{ORIGIN}/social-{lang}.png" />
	<meta property="og:image:width" content="2400" />
	<meta property="og:image:height" content="1260" />
	<meta
		property="og:image:alt"
		content={lang === 'pl'
			? 'Scrutabor — modlitwa po łacinie ze zrozumieniem'
			: 'Scrutabor — prayer in Latin with understanding'}
	/>
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- The prerendered text reads perfectly without scripting — that is the
     point of prerendering — but every CONTROL on it needs the runtime, and
     a select that moves while nothing happens is worse than one that says
     why. The downloaded copy has carried its own noscript from birth; the
     site's pages get the same honesty. -->
<noscript>
	<p class="noscript-note">
		{#if rest === '/search'}
			{lang === 'pl'
				? 'Włącz JavaScript, aby wyszukiwać w modlitewniku.'
				: 'Turn on JavaScript to search the prayer book.'}
		{:else if rest === '/lemma'}
			{lang === 'pl'
				? 'Włącz JavaScript, aby otworzyć hasło słownikowe.'
				: 'Turn on JavaScript to open a dictionary entry.'}
		{:else if rest === '/bibliographia'}
			{lang === 'pl'
				? 'Spis źródeł można czytać bez JavaScriptu. Włącz go, aby zobaczyć odwołania przy poszczególnych źródłach.'
				: 'You can read the list of sources without JavaScript. Turn it on to see the citations for each source.'}
		{:else}
			{lang === 'pl'
				? 'Możesz czytać bez JavaScriptu. Włącz go, aby zmienić dzień, rolę, tryb czytania albo wielkość pisma lub otworzyć analizę słowa.'
				: 'You can read without JavaScript. Turn it on to change the day, your role at Mass, the reading mode or the text size, or to open a word analysis.'}
		{/if}
	</p>
</noscript>

{@render children()}

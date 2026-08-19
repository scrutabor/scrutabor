<script lang="ts">
	// jscpd:ignore-start — the same scaffolding as the app's language
	// layout, deliberately: the two must do the same thing without
	// depending on each other (their head URLs differ; nothing else may).
	import type { Lang } from '$lib/i18n';
	import { ORIGIN } from '$lib/site';
	import { adoptLanguage } from '$lib/where.svelte';

	let { children, data } = $props();

	const lang = $derived(data.lang as Lang);
	const rest = $derived(data.path);

	$effect(() => {
		adoptLanguage(lang, rest);
	});
	// jscpd:ignore-end
</script>

<svelte:head>
	<!-- jscpd:ignore-start — the same SEO head as the app's language
	     layout, at the landing's own origin-root URLs. Named, not merged:
	     the two layouts must not depend on each other. -->
	<link rel="canonical" href="{ORIGIN}/{lang}{rest}" />
	<link rel="alternate" hreflang="en" href="{ORIGIN}/en{rest}" />
	<link rel="alternate" hreflang="pl" href="{ORIGIN}/pl{rest}" />
	<link rel="alternate" hreflang="x-default" href="{ORIGIN}/en{rest}" />
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
			: 'Scrutabor — prayer in Latin, with understanding'}
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<!-- jscpd:ignore-end -->
</svelte:head>

<!-- The page reads without scripting; the controls on it do not, and a
     control that moves while nothing happens is worse than one that says
     why. The app's layout carries the same note for the book's pages. -->
<noscript>
	<p class="noscript-note">
		{lang === 'pl'
			? 'Ta strona czyta się bez JavaScriptu, ale jej przełączniki — próbka, motyw, wielkość pisma — wymagają jego włączenia.'
			: 'The page reads without JavaScript, but its controls — the specimen, the theme, the text size — need it turned on.'}
	</p>
</noscript>

{@render children()}

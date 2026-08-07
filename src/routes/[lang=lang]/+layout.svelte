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
	<!-- jscpd:ignore-end -->
</svelte:head>

{@render children()}

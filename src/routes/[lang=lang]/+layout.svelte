<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import { ORIGIN } from '$lib/site';

	let { children, data } = $props();

	const lang = $derived(data.lang as Lang);
	const rest = $derived(data.path);

	// Remember the language a reader chose here, so the app's own router
	// at /app/ opens in it, and keep the live DOM lang in sync (the
	// prerendered <html lang> is set by hooks).
	$effect(() => {
		document.documentElement.lang = lang;
		localStorage.setItem('scrutabor-lang', lang);
	});
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

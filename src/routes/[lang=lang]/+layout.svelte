<script lang="ts">
	import { page } from '$app/state';
	import type { Lang } from '$lib/i18n';
	import { ORIGIN } from '$lib/site';

	let { children } = $props();

	const lang = $derived(page.params.lang as Lang);
	// The language-relative path; canonical drops any query (?w= deep
	// links canonicalize to their page).
	const rest = $derived(page.url.pathname.replace(/^\/(pl|en)/, ''));

	// Remember the reader's language and keep the live DOM lang in sync on
	// client-side navigation (the prerendered <html lang> is set by hooks).
	$effect(() => {
		document.documentElement.lang = lang;
		localStorage.setItem('scrutabor-lang', lang);
	});
</script>

<svelte:head>
	<link rel="canonical" href="{ORIGIN}/{lang}{rest}" />
	<link rel="alternate" hreflang="en" href="{ORIGIN}/en{rest}" />
	<link rel="alternate" hreflang="pl" href="{ORIGIN}/pl{rest}" />
	<link rel="alternate" hreflang="x-default" href="{ORIGIN}/en{rest}" />
	<meta property="og:site_name" content="Scrutabor" />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={lang === 'pl' ? 'pl_PL' : 'en_US'} />
</svelte:head>

{@render children()}

<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import { ORIGIN } from '$lib/site';
	import { where } from '$lib/where.svelte';

	let { children, data } = $props();

	// From the layout's own load, not from the router: see +layout.ts.
	const lang = $derived(data.lang as Lang);
	const rest = $derived(data.path);

	// Remember the reader's language and keep the live DOM lang in sync on
	// client-side navigation (the prerendered <html lang> is set by hooks).
	$effect(() => {
		where.path = rest;
		document.documentElement.lang = lang;
		localStorage.setItem('scrutabor-lang', lang);
	});
</script>

<svelte:head>
	<link rel="canonical" href="{ORIGIN}/app/{lang}{rest}" />
	<link rel="alternate" hreflang="en" href="{ORIGIN}/app/en{rest}" />
	<link rel="alternate" hreflang="pl" href="{ORIGIN}/app/pl{rest}" />
	<link rel="alternate" hreflang="x-default" href="{ORIGIN}/app/en{rest}" />
	<meta property="og:site_name" content="Scrutabor" />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={lang === 'pl' ? 'pl_PL' : 'en_US'} />
</svelte:head>

{@render children()}

<script lang="ts">
	import { page } from '$app/state';
	import { M, type Lang } from '$lib/i18n';

	// The client-side error boundary (a stale in-app link to a page that
	// was never prerendered, for example); direct hits on unknown URLs
	// are answered by the static 404.html instead. The language comes
	// from the path being attempted, defaulting to English.
	// Read from the document rather than the router: this page is also the
	// 404 of a downloaded copy, where no router is running.
	const lang: Lang = $derived(
		(typeof location !== 'undefined' ? location.pathname : page.url.pathname).includes('/pl')
			? 'pl'
			: 'en'
	);
	const message = $derived(page.status === 404 ? M[lang].pageNotFound : M[lang].errorGeneric);
</script>

<svelte:head>
	<title>{page.status} — Scrutabor</title>
</svelte:head>

<div class="page centered errorpage">
	<main>
		<p class="status">{page.status}</p>
		<p class="line" {lang}>
			{message}
			<a href="/{lang}">{M[lang].goHome} ›</a>
		</p>
	</main>
</div>

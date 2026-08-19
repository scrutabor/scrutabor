<script lang="ts">
	import { page } from '$app/state';
	import { M, type Lang } from '$lib/i18n';
	import { pageUrl } from '$lib/url';

	// The client-side error boundary (a stale in-app link to a page that
	// was never prerendered, for example); direct hits on unknown URLs
	// are answered by the static 404.html instead. The language comes from
	// the path being attempted, defaulting to English — and it comes through
	// $lib/url, because in a downloaded copy the path is in the hash and
	// `location.pathname` is wherever the reader unzipped the book, which
	// answered English to a Polish reader every time.
	const lang: Lang = $derived(
		(typeof location !== 'undefined' ? pageUrl().pathname : page.url.pathname).includes('/pl')
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

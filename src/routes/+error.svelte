<script lang="ts">
	import { page } from '$app/state';
	import { M, type Lang } from '$lib/i18n';

	// The client-side error boundary (a stale in-app link to a page that
	// was never prerendered, for example); direct hits on unknown URLs
	// are answered by the static 404.html instead. The language comes
	// from the path being attempted, defaulting to English.
	const lang: Lang = $derived(page.url.pathname.startsWith('/pl') ? 'pl' : 'en');
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

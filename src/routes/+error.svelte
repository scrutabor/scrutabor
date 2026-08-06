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

<div class="page errorpage">
	<main>
		<p class="status">{page.status}</p>
		<p class="line" {lang}>
			{message}
			<a href="/{lang}">{M[lang].goHome} ›</a>
		</p>
	</main>
</div>

<style>
	/* the book's measure comes from .page; these pages add a full
	   viewport so their one line of content can sit in the middle */
	.errorpage {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.status {
		margin: 0;
		font-size: 3.4rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		color: var(--ink-soft);
	}

	.line {
		margin: 1.1rem 0 0;
		font-size: 1.1rem;
	}

	.line a {
		color: var(--rubric);
		text-decoration: none;
	}

	.line a:hover {
		text-decoration: underline;
	}
</style>

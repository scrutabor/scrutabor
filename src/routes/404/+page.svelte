<script lang="ts">
	import { LANGS, M } from '$lib/i18n';
</script>

<!-- Prerendered to /404.html, which Cloudflare Pages serves with a real
     404 status for every unmatched path (its presence also switches off
     the SPA fallback that answered 200 for anything). The server cannot
     know the reader's language, so the page speaks both, English first. -->
<svelte:head>
	<title>404 — Scrutabor</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page notfound">
	<main>
		<p class="status">404</p>
		{#each LANGS as lang (lang)}
			<p class="line" {lang}>
				{M[lang].pageNotFound}
				<a href="/{lang}">{M[lang].goHome} ›</a>
			</p>
		{/each}
	</main>
</div>

<style>
	/* the book's measure comes from .page; these pages add a full
	   viewport so their one line of content can sit in the middle */
	.notfound {
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

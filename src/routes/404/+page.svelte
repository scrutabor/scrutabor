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

<div class="page centered notfound">
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

<script lang="ts">
	import { page } from '$app/state';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
</script>

<svelte:head>
	<title>Scrutabor — {msgs.tagline.toLowerCase().replace(/\.$/, '')}</title>
</svelte:head>

<div class="landing">
	<nav>
		<LangMenu {lang} />
		<ThemeToggle {lang} />
	</nav>
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="tagline">{msgs.tagline}</p>
		<p class="motto" lang="la">
			„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
		</p>
		<p class="motto-ref smallcaps">{msgs.mottoRef}</p>

		<a class="card" href="/{lang}/ordinarium/confiteor">
			<span class="card-cat smallcaps">{msgs.cardCat}</span>
			<span class="card-title" lang="la">Confíteor</span>
			<span class="card-note">{msgs.cardNote}</span>
		</a>

		<p class="working smallcaps">{msgs.working}</p>
	</main>
</div>

<style>
	.landing {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	nav {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.5rem;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: 3.4rem;
		font-weight: 500;
		letter-spacing: 0.12em;
	}

	.tagline {
		margin: 0.4rem 0 0;
		font-size: 1.2rem;
		color: var(--ink-soft);
	}

	.motto {
		margin: 2.6rem 0 0;
		font-style: italic;
		font-size: 1.1rem;
		line-height: 1.6;
		max-width: 28rem;
	}

	.motto-ref {
		margin: 0.3rem 0 0;
		font-size: 0.8rem;
		color: var(--ink-soft);
	}

	.card {
		margin: 3rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		padding: 1.1rem 2.6rem;
		background: var(--surface);
	}

	.card:hover {
		background: var(--wash);
	}

	.card-cat {
		font-size: 0.75rem;
		color: var(--rubric);
	}

	.card-title {
		font-size: 1.6rem;
	}

	.card-note {
		font-size: 0.95rem;
		color: var(--ink-soft);
		font-style: italic;
	}

	.working {
		margin: 3rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
</style>

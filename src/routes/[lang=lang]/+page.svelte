<script lang="ts">
	import { page } from '$app/state';
	import { CATALOG } from '$lib/catalog';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
</script>

<svelte:head>
	<title>Scrutabor — {msgs.tagline.toLowerCase().replace(/\.$/, '')}</title>
	<meta name="description" content={msgs.catalogDescription} />
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

		{#each CATALOG as section (section.category)}
			<section>
				<h2 class="smallcaps">{section.label[lang]}</h2>
				<div class="cards">
					<!-- The flow view leads the ordinary, and looks like it: for a
					     reader following Mass it is the way in, not a footnote to
					     the list of texts. -->
					{#if section.category === 'ordinarium'}
						<a class="card card-flow" href="/{lang}/ordo">
							<span class="card-title" lang="la">Ordo Missæ</span>
							<span class="card-note">{msgs.ordoTitle}</span>
						</a>
					{/if}
					{#each section.texts as t (t.slug)}
						<a class="card" href="/{lang}/{t.category}/{t.slug}">
							<span class="card-title" lang="la">{t.title}</span>
							<span class="card-note">{t.note[lang]}</span>
						</a>
					{/each}
				</div>
			</section>
		{/each}

		<p class="grammar-link smallcaps">
			<a href="/{lang}/grammatica">{msgs.grammarTitle} →</a>
		</p>
		<p class="working smallcaps"><a href="/{lang}/editio">{msgs.working}</a></p>
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

	section {
		margin: 2.6rem 0 0;
		width: 100%;
		max-width: 30rem;
	}

	h2 {
		margin: 0 0 0.7rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--rubric);
		text-align: center;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		padding: 0.8rem 1.4rem;
		background: var(--surface);
	}

	.card:hover {
		background: var(--wash);
	}

	.card-title {
		font-size: 1.35rem;
	}

	.card-note {
		font-size: 0.9rem;
		color: var(--ink-soft);
		font-style: italic;
		text-align: right;
	}

	/* The whole Mass, one tap: a card like the texts it gathers, marked
	   with the rubric so the eye finds it first. */
	.card-flow {
		border-color: var(--rubric);
	}

	.card-flow .card-title {
		color: var(--rubric);
	}

	.grammar-link {
		margin: 3rem 0 0;
		font-size: 0.8rem;
	}

	.grammar-link a {
		color: var(--ink-soft);
		text-decoration: none;
	}

	.grammar-link a:hover {
		color: var(--ink);
	}

	.working {
		margin: 0.6rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
</style>

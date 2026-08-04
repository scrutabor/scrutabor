<script lang="ts">
	import { page } from '$app/state';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { CONCEPTS, CONCEPT_GROUPS, type ConceptGroup } from '$lib/grammar';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
	const groups = $derived(
		(Object.keys(CONCEPT_GROUPS) as ConceptGroup[]).map((g) => ({
			id: g,
			label: CONCEPT_GROUPS[g][lang],
			concepts: CONCEPTS.filter((c) => c.group === g)
		}))
	);
</script>

<svelte:head>
	<title>{msgs.grammarTitle} — Scrutabor</title>
	<meta name="description" content={msgs.grammarDescription} />
</svelte:head>

<div class="page">
	<nav>
		<a href="/{lang}" class="back smallcaps">scrutabor</a>
		<div class="nav-right">
			<LangMenu {lang} />
			<ThemeToggle {lang} />
		</div>
	</nav>
	<main>
		<h1>{msgs.grammarTitle}</h1>
		{#each groups as group (group.id)}
			<section>
				<h2 class="smallcaps">{group.label}</h2>
				<div class="cards">
					{#each group.concepts as c (c.id)}
						<a class="card" href="/{lang}/grammatica/{c.id}">
							<span class="card-title">{c.label[lang]}</span>
							{#if c.la !== c.label[lang]}
								<span class="card-note" lang="la">{c.la}</span>
							{/if}
						</a>
					{/each}
				</div>
			</section>
		{/each}
		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'wymowa' : 'pronunciation'}</h2>
			<div class="cards">
				<a class="card" href="/{lang}/grammatica/pronuntiatio">
					<span class="card-title">{lang === 'pl' ? 'wymowa' : 'pronunciation'}</span>
					<span class="card-note" lang="la">pronuntiatio</span>
				</a>
			</div>
		</section>
	</main>
</div>

<style>
	.page {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	h1 {
		margin: 1.8rem 0 0;
		font-size: 2.2rem;
		font-weight: 500;
		text-align: center;
	}

	section {
		margin: 2.2rem auto 0;
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
		padding: 0.7rem 1.4rem;
		background: var(--surface);
	}

	.card:hover {
		background: var(--wash);
	}

	.card-title {
		font-size: 1.15rem;
	}

	.card-note {
		font-size: 0.9rem;
		color: var(--ink-soft);
		font-style: italic;
	}
</style>

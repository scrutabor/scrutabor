<script lang="ts">
	import { page } from '$app/state';
	import PageNav from '$lib/components/PageNav.svelte';
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
	<PageNav {lang} />
	<main>
		<h1 class="minor">{msgs.grammarTitle}</h1>
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
	section {
		margin: 2.2rem auto 0;
		max-width: 30rem;
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

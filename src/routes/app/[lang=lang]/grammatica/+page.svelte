<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { CONCEPTS, CONCEPT_GROUPS, type ConceptGroup } from '$lib/grammar';
	import { M, type Lang } from '$lib/i18n';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
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
	<title>{msgs.grammarPageTitle} — Scrutabor</title>
	<meta name="description" content={msgs.grammarDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />
	<main>
		<h1 class="minor">{msgs.grammarPageTitle}</h1>
		{#each groups as group (group.id)}
			<section>
				<h2 class="smallcaps">{group.label}</h2>
				<div class="cards in-two">
					{#each group.concepts as c (c.id)}
						<a class="card" href="/app/{lang}/grammatica/{c.id}">
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
			<div class="cards in-two">
				<a class="card" href="/app/{lang}/grammatica/pronuntiatio">
					<span class="card-title">{lang === 'pl' ? 'wymowa' : 'pronunciation'}</span>
					<span class="card-note" lang="la">pronuntiatio</span>
				</a>
			</div>
		</section>
	</main>
</div>

<style>
	/* the cards take the frame, and stand in two above 85rem — see
	   .in-two in app.css */
	section {
		margin: 2.2rem auto 0;
	}

	.card-title {
		font-size: 1.15rem;
	}

	.card-note {
		font-size: 0.9rem;
		color: var(--ink-soft);
	}
</style>

<script lang="ts">
	import AnalysisRow from '$lib/components/AnalysisRow.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import WordIdentity from '$lib/components/WordIdentity.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { GENDER_MARK, describeLemma } from '$lib/morph';

	// entry, senses and concordance all arrive prerendered (+page.server.ts)
	let { data } = $props();

	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const lemma = $derived(data.lemma);
	const entry = $derived(data.entry);
	const sense = $derived(data.sense);
	// The display headword is the first component of the dictionary head
	// (oro of "oro, oráre, orávi, orátum") — liturgical orthography, unlike
	// the normalized lemma in the URL.
	const headword = $derived((entry?.head ?? lemma).split(',')[0].trim());
	const texts = $derived(data.occurrences);
</script>

<svelte:head>
	<title>{headword} — Scrutabor</title>
	{#if sense}
		<meta name="description" content={sense.senses.join(', ')} />
	{/if}
</svelte:head>

<div class="page">
	<PageNav {lang} />

	{#if !entry}
		<main>
			<p class="notfound">{msgs.notFound}</p>
		</main>
	{:else}
		<main>
			<WordIdentity form={headword} {lang} level={1} placement="page" />

			<div class="lexical-summary">
				<AnalysisRow label={msgs.wordEntryLabel} id="lemma-entry-label" level={2} first>
					<p class="head">
						<i lang="la">{entry.head}</i>{#if entry.gender}&nbsp;<span class="gender"
								>{GENDER_MARK[entry.gender]}</span
							>{/if}{#if sense}<span class="head-senses">{' — '}{sense.senses.join(', ')}</span
							>{/if}
					</p>
					{#if sense?.note}
						<p class="note">{sense.note}</p>
						<SourceNotes citations={sense.note_citations} {lang} />
					{/if}
				</AnalysisRow>

				<AnalysisRow label={msgs.grammarTitle} id="lemma-grammar-label" level={2}>
					<p class="grammar">{describeLemma(entry, lang)}</p>
				</AnalysisRow>

				{#if sense?.derivatives}
					<AnalysisRow label={msgs.derivativesLabel} id="lemma-derivatives-label" level={2}>
						<p class="derivatives">{sense.derivatives.join(', ')}</p>
					</AnalysisRow>
				{/if}
			</div>

			{#if texts.length > 0}
				<section class="occurrences in-two">
					<h2 class="smallcaps">{msgs.occurrences}</h2>
					{#each texts as t (t.textKey)}
						<p class="occ-row">
							<span class="occ-title" lang="la">{t.title}</span>
							<span class="occ-forms">
								{#each t.items as occ, i (occ.wordId)}{#if i > 0}{', '}{/if}<a
										class="occ-form"
										lang="la"
										href="/app/{lang}/{t.textKey}?w={occ.wordId}">{occ.form}</a
									>{/each}
							</span>
						</p>
					{/each}
				</section>
			{/if}

			<p class="external smallcaps">
				{msgs.externalDict}:
				<a href="https://logeion.uchicago.edu/{lemma}" target="_blank" rel="external noopener"
					>Logeion</a
				>
			</p>
		</main>
	{/if}
</div>

<style>
	.lexical-summary {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		column-gap: 0.8rem;
		margin: 1.25rem auto 0;
		padding: 1.15rem 1.4rem 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
	}

	.head {
		margin: 0;
		font-size: 1rem;
	}

	.gender {
		font-size: 0.9rem;
	}

	.grammar,
	.derivatives {
		margin: 0;
		font-size: 1rem;
	}

	.note {
		margin: 0.35rem 0 0;
		font-size: 1rem;
	}

	/* 77 occurrences of dóminus across 44 texts: the one list here long
	   enough that halving its height is worth a column — see .in-two */
	.occurrences {
		margin: 2.4rem auto 0;
	}

	.occ-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.15rem 1rem;
		margin: 0 0 0.5rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.5rem;
	}

	.occ-title {
		min-width: 0;
		max-width: 100%;
		font-size: 1.05rem;
		overflow-wrap: anywhere;
	}

	.occ-forms {
		margin-inline-start: auto;
		text-align: right;
		font-size: 1.05rem;
		line-height: 1.9;
	}

	.occ-form {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.occ-form:hover {
		color: var(--rubric);
	}

	.notfound {
		margin: 3rem 0;
		text-align: center;
		color: var(--ink-soft);
	}

	.external {
		margin: 2.8rem 0 0;
		text-align: center;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.external a {
		color: inherit;
	}

	.external a:hover {
		color: var(--ink);
	}

	@media (max-width: 36rem) {
		.lexical-summary {
			display: block;
			padding: 1rem 1.05rem 1.1rem;
		}
	}
</style>

<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import Pronunciation from '$lib/components/Pronunciation.svelte';
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
			<h1 lang="la">{headword}</h1>
			<p class="head">
				<i lang="la">{entry.head}</i>{#if entry.gender}&nbsp;<span class="gender"
						>{GENDER_MARK[entry.gender]}</span
					>{/if}
			</p>
			<p class="pos">{describeLemma(entry, lang)}</p>
			<Pronunciation form={headword} {lang} centered />

			{#if sense}
				<p class="senses">{sense.senses.join(', ')}</p>
				{#if sense.note}
					<p class="note">{sense.note}</p>
				{/if}
				{#if sense.derivatives}
					<p class="derivatives">
						<span class="label smallcaps">{msgs.derivativesLabel}</span>
						{sense.derivatives.join(', ')}
					</p>
				{/if}
			{/if}

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
	.head {
		margin: 0.4rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-size: 1.15rem;
	}

	.gender {
		font-size: 0.95rem;
	}

	.pos {
		margin: 0.2rem 0 0;
		text-align: center;
		color: var(--rubric);
		font-size: 0.95rem;
	}

	.senses {
		margin: 1.6rem 0 0;
		text-align: center;
		font-size: 1.3rem;
		font-style: italic;
	}

	.note {
		margin: 0.7rem auto 0;
		max-width: 28rem;
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.55;
	}

	.derivatives {
		margin: 0.9rem auto 0;
		max-width: 28rem;
		text-align: center;
		font-size: 0.98rem;
	}

	.derivatives .label {
		color: var(--ink-soft);
		font-size: 0.75rem;
		margin-right: 0.35rem;
	}

	/* 77 occurrences of dóminus across 44 texts: the one list here long
	   enough that halving its height is worth a column — see .in-two */
	.occurrences {
		margin: 2.6rem auto 0;
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
		font-size: 1.05rem;
		white-space: nowrap;
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
</style>

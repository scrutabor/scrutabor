<script lang="ts">
	import { page } from '$app/state';
	import { occurrencesOf } from '$lib/concordance';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { LEXICON } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { GENDER_MARK, describeLemma } from '$lib/morph';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
	const lemma = $derived(page.params.lemma ?? '');
	const entry = $derived(LEXICON.lemmata[lemma]);
	const sense = $derived(LEXICON.senses[lang][lemma]);
	// The display headword is the first component of the dictionary head
	// (oro of "oro, oráre, orávi, orátum") — liturgical orthography, unlike
	// the normalized lemma in the URL.
	const headword = $derived((entry?.head ?? lemma).split(',')[0].trim());
	const texts = $derived(occurrencesOf(lemma));
</script>

<svelte:head>
	<title>{headword} — Scrutabor</title>
	{#if sense}
		<meta name="description" content={sense.senses.join(', ')} />
	{/if}
</svelte:head>

<div class="page">
	<nav>
		<a href="/{lang}" class="back smallcaps">scrutabor</a>
		<div class="nav-right">
			<LangMenu {lang} />
			<ThemeToggle {lang} />
		</div>
	</nav>

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

			{#if sense}
				<p class="senses">{sense.senses.join(', ')}</p>
				{#if sense.note}
					<p class="note">{sense.note}</p>
				{/if}
			{/if}

			{#if texts.length > 0}
				<section class="occurrences">
					<h2 class="smallcaps">{msgs.occurrences}</h2>
					{#each texts as t (t.textKey)}
						<p class="occ-row">
							<span class="occ-title" lang="la">{t.title}</span>
							<span class="occ-forms">
								{#each t.items as occ, i (occ.wordId)}{#if i > 0}{', '}{/if}<a
										class="occ-form"
										lang="la"
										href="/{lang}/{t.textKey}?w={occ.wordId}">{occ.form}</a
									>{/each}
							</span>
						</p>
					{/each}
				</section>
			{/if}

			<p class="external smallcaps">
				{msgs.externalDict}:
				<a href="https://logeion.uchicago.edu/{lemma}" rel="external">Logeion ↗</a>
			</p>
		</main>
	{/if}
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
		font-size: 2.6rem;
		font-weight: 500;
		text-align: center;
	}

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

	.occurrences {
		margin: 2.6rem auto 0;
		max-width: 30rem;
	}

	h2 {
		margin: 0 0 0.7rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--rubric);
		text-align: center;
	}

	.occ-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 0.5rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.5rem;
	}

	.occ-title {
		font-size: 1.05rem;
		white-space: nowrap;
	}

	.occ-forms {
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

<script lang="ts">
	// The word analysis itself — everything the panel says about a word,
	// without deciding where it is said. The reading surfaces present it
	// in a sheet (WordPanel); the landing presents it in a box that never
	// closes, because there its whole purpose is to be looked at.
	import Pronunciation from '$lib/components/Pronunciation.svelte';
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import type { Analysis, LemmaEntry, SenseEntry, Word, WordGloss } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { GENDER_MARK, describeAnalysisParts, describeMorphParts } from '$lib/morph';

	let {
		word,
		gloss,
		analysis,
		lex,
		lang,
		onnavigate,
		sectioned = false
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		/** Only the entries this page's words need — the whole dictionary is
		 * never sent to the browser (see the route's +page.server.ts). */
		lex: { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> };
		lang: Lang;
		onnavigate: (id: string) => void;
		/** The reading sheet names each information layer. The landing
		 * specimen keeps the compact, uninterrupted presentation. */
		sectioned?: boolean;
	} = $props();

	// Cross-references in function prose are authored as „form” (wNNN)
	// (EN: “form” (wNNN)) — see the corpus repo's SCHEMA.md. Render the
	// quoted form as a link to that word and hide the id from the reader.
	const XREF = /([„“])([^”“„]+)”\s*\((w\d{3})\)/g;

	type FnPart = { text: string } | { open: string; form: string; id: string };

	function parseFunction(fn: string): FnPart[] {
		const parts: FnPart[] = [];
		let last = 0;
		for (const m of fn.matchAll(XREF)) {
			if (m.index > last) parts.push({ text: fn.slice(last, m.index) });
			parts.push({ open: m[1], form: m[2], id: m[3] });
			last = m.index + m[0].length;
		}
		if (last < fn.length) parts.push({ text: fn.slice(last) });
		return parts;
	}

	let functionParts = $derived(gloss?.function ? parseFunction(gloss.function) : []);

	// The per-lemma layer: dictionary head + gender in the header, senses and
	// an optional lemma-level note below the contextual gloss. The corpus
	// checks guarantee an entry for every lemma; fall back to the bare lemma
	// so a stale snapshot degrades visibly instead of crashing.
	let lemmaEntry = $derived(lex.lemmata[word.lemma]);
	let senseEntry = $derived(lex.senses[word.lemma]);
</script>

{#snippet context()}
	{#if gloss}
		<p class="gloss">{gloss.gloss}</p>
	{/if}
	{#if gloss?.function}
		<p class="function">
			{#each functionParts as part, i (i)}
				{#if 'id' in part}
					<button class="xref" onclick={() => onnavigate(part.id)}
						>{part.open}<span lang="la">{part.form}</span>”</button
					>
				{:else}
					{part.text}
				{/if}
			{/each}
		</p>
		<SourceNotes citations={gloss.function_citations} {lang} />
	{/if}
{/snippet}

{#snippet entry()}
	<p class="head">
		<a href="/app/{lang}/lemma/{word.lemma}" title={M[lang].lemmaPageHint}
			><i lang="la">{lemmaEntry?.head ?? word.lemma}</i>{#if lemmaEntry?.gender}&nbsp;<span
					class="gender">{GENDER_MARK[lemmaEntry.gender]}</span
				>{/if}</a
		>{#if senseEntry}<span class="head-senses">— {senseEntry.senses.join(', ')}</span>{/if}
	</p>
	{#if senseEntry?.note}
		<p class="note">{senseEntry.note}</p>
		<SourceNotes citations={senseEntry.note_citations} {lang} />
	{/if}
{/snippet}

{#snippet grammar()}
	<p class="morph">
		{#each describeMorphParts(word.morph, lang) as part, i (i)}{#if part.concept}<a
					class="concept"
					href="/app/{lang}/grammatica/{part.concept}">{part.text}</a
				>{:else}{part.text}{/if}{/each}
	</p>
{/snippet}

{#snippet verification()}
	<p class="meta smallcaps">
		{#each describeAnalysisParts(analysis, lang) as part, i (i)}{#if part.href}<a
					href={part.href}
					target={part.external ? '_blank' : undefined}
					rel={part.external ? 'external noopener' : undefined}>{part.text}</a
				>{:else}{part.text}{/if}{/each}
	</p>
{/snippet}

{#if sectioned}
	<div class="pronunciation-lead">
		<Pronunciation form={word.form} {lang} />
	</div>
	<div class="layers">
		{#if gloss}
			<section class="layer context-layer" aria-label={M[lang].wordContextLabel}>
				<div class="layer-body">{@render context()}</div>
			</section>
		{/if}
		<section class="layer" aria-labelledby="word-entry-label">
			<h3 class="layer-label smallcaps" id="word-entry-label">{M[lang].wordEntryLabel}</h3>
			<div class="layer-body">{@render entry()}</div>
		</section>
		<section class="layer" aria-labelledby="word-form-label">
			<h3 class="layer-label smallcaps" id="word-form-label">{M[lang].wordFormLabel}</h3>
			<div class="layer-body">{@render grammar()}</div>
		</section>
		<div class="verification">
			{@render verification()}
		</div>
	</div>
{:else}
	{@render entry()}
	{@render grammar()}
	<Pronunciation form={word.form} {lang} />
	{@render context()}
	{@render verification()}
{/if}

<style>
	.head {
		margin: 0.15rem 0 0;
		color: var(--ink-soft);
		font-size: 1.05rem;
	}

	.head a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.head a:hover {
		color: var(--rubric);
	}

	.head-senses {
		margin-inline-start: 0.2em;
		font-style: normal;
	}

	.gender {
		font-size: 0.9rem;
	}

	.note {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.morph {
		margin: 0.35rem 0 0;
		color: var(--rubric);
		font-size: 1rem;
	}

	.concept {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.concept:hover {
		border-bottom-style: solid;
	}

	.gloss {
		margin: 0.6rem 0 0;
		font-size: 1.25rem;
		font-style: italic;
	}

	.function {
		margin: 0.45rem 0 0;
		font-size: 1.05rem;
		line-height: 1.55;
	}

	.xref {
		font: inherit;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
		cursor: pointer;
		border-bottom: 1px dotted var(--rubric);
	}

	.xref:hover {
		color: var(--rubric);
	}

	.meta {
		margin: 0.8rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.meta a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	.meta a:hover {
		color: var(--ink);
	}

	.layers {
		padding-top: 0.15rem;
	}

	.layer {
		display: grid;
		grid-template-columns: 4.4rem minmax(0, 1fr);
		column-gap: 0.8rem;
		margin: 0.75rem 0 0;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border);
	}

	.context-layer {
		margin-top: 0.25rem;
		padding-top: 0;
		border-top: 0;
	}

	.context-layer .layer-body {
		grid-column: 1 / -1;
	}

	.layer-label {
		margin: 0;
		color: var(--ink-soft);
		font-family: 'EB Garamond Label', 'EB Garamond', serif;
		font-size: 0.7rem;
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.11em;
	}

	.layer-body {
		min-width: 0;
	}

	.layers .gloss {
		margin-top: 0.25rem;
	}

	.layers .function {
		margin-top: 0.6rem;
	}

	.layers .head,
	.layers .morph {
		margin-top: 0;
	}

	.layers .morph {
		color: var(--ink);
	}

	.verification {
		margin: 0.8rem 0 0;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border);
		color: var(--ink-soft);
	}

	.verification .meta {
		margin-top: 0;
	}

	@media (max-width: 36rem) {
		.layer {
			display: block;
		}

		.layer-body {
			margin-top: 0.25rem;
		}
	}
</style>

<script lang="ts">
	// The word analysis itself — everything the panel says about a word,
	// without deciding where it is said. WordPanel decides whether the
	// shared analysis sits in a dismissible sheet or permanently in the
	// landing page; there is deliberately only one information layout.
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
		onnavigate
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		/** Only the entries this page's words need — the whole dictionary is
		 * never sent to the browser (see the route's +page.server.ts). */
		lex: { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> };
		lang: Lang;
		onnavigate: (id: string) => void;
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
		<p class="context-copy">
			<span class="gloss">{gloss.gloss}</span>
			{#if gloss.function}<span class="context-separator">—</span><span class="function">
					{#each functionParts as part, i (i)}
						{#if 'id' in part}
							<button class="xref" onclick={() => onnavigate(part.id)}
								>{part.open}<span lang="la">{part.form}</span>”</button
							>
						{:else}
							{part.text}
						{/if}
					{/each}
				</span>{/if}
		</p>
	{/if}
	{#if gloss?.function}
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

<style>
	.head {
		margin: 0.15rem 0 0;
		color: var(--ink);
		font-size: 1rem;
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
		color: var(--ink);
		font-size: 1rem;
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

	.context-copy {
		margin: 0;
		font-size: 1rem;
	}

	.gloss {
		font-weight: 500;
	}

	.context-separator {
		margin-inline: 0.38em;
		color: var(--ink-soft);
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
		padding-top: 0;
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
		margin-top: 0.35rem;
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

		.context-layer .layer-body {
			margin-top: 0;
		}

		.layer-body {
			margin-top: 0.25rem;
		}
	}
</style>

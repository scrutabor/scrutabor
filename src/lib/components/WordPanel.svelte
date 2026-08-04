<script lang="ts">
	import { LEXICON, type Analysis, type Word, type WordGloss } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { GENDER_MARK, describeAnalysis, describeMorph } from '$lib/morph';

	let {
		word,
		gloss,
		analysis,
		lang,
		onclose,
		onnavigate
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		lang: Lang;
		onclose: () => void;
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
	let lemmaEntry = $derived(LEXICON.lemmata[word.lemma]);
	let senseEntry = $derived(LEXICON.senses[lang][word.lemma]);
</script>

<aside aria-label={M[lang].panelAria}>
	<div class="inner">
		<header>
			<span class="form" lang="la">{word.form}</span>
			<button class="close" onclick={onclose} aria-label={M[lang].close}>×</button>
		</header>
		<p class="head">
			<i lang="la">{lemmaEntry?.head ?? word.lemma}</i>{#if lemmaEntry?.gender}&nbsp;<span
					class="gender">{GENDER_MARK[lemmaEntry.gender]}</span
				>{/if}
		</p>
		<p class="morph">{describeMorph(word.morph, lang)}</p>
		{#if gloss}
			<p class="gloss">{gloss.gloss}</p>
		{/if}
		{#if senseEntry}
			<p class="senses">
				<span class="label smallcaps">{M[lang].dictLabel}</span>
				{senseEntry.senses.join(', ')}
			</p>
			{#if senseEntry.note}
				<p class="note">{senseEntry.note}</p>
			{/if}
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
		{/if}
		<p class="meta smallcaps">{describeAnalysis(analysis, lang)}</p>
	</div>
</aside>

<style>
	aside {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		background: var(--surface);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow);
		z-index: 10;
	}

	.inner {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1rem 1.5rem calc(1.25rem + env(safe-area-inset-bottom));
		max-height: 45vh;
		overflow-y: auto;
	}

	header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	.form {
		font-size: 1.7rem;
		font-weight: 500;
	}

	.head {
		margin: 0.15rem 0 0;
		color: var(--ink-soft);
		font-size: 1.05rem;
	}

	.gender {
		font-size: 0.9rem;
	}

	.senses {
		margin: 0.45rem 0 0;
		font-size: 1rem;
		line-height: 1.5;
	}

	.senses .label {
		color: var(--ink-soft);
		font-size: 0.75rem;
		margin-right: 0.35rem;
	}

	.note {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.close {
		margin-left: auto;
		font: inherit;
		font-size: 1.3rem;
		line-height: 1;
		background: none;
		border: none;
		color: var(--ink-soft);
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}

	.close:hover {
		color: var(--ink);
	}

	.morph {
		margin: 0.35rem 0 0;
		color: var(--rubric);
		font-size: 1rem;
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
</style>

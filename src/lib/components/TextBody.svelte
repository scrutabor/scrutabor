<script lang="ts">
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import type { Lang } from '$lib/i18n';

	// The rendered text itself, shared by the reading page and the ordo
	// flow. `ontap` decides which of the two it is: with it, words are
	// buttons carrying their corpus id (the study surface); without it,
	// they are plain text — the flow inlines several texts on one page,
	// where word ids would collide anyway.
	let {
		doc,
		gloss,
		lang,
		helpLevel,
		selectedId = null,
		ontap
	}: {
		doc: TextDocument;
		gloss: GlossDocument;
		lang: Lang;
		helpLevel: number;
		selectedId?: string | null;
		ontap?: (id: string) => void;
	} = $props();
</script>

{#snippet face(id: string, form: string)}<ruby
		>{form}{#if helpLevel >= 1}<rt {lang}>{gloss.words[id]?.gloss}</rt>{/if}</ruby
	>{/snippet}

{#each doc.segments as seg (seg.id)}
	{#if seg.type === 'rubric'}
		<div class="rubric">
			<p class="rubric-la" lang="la">{seg.text}</p>
			<!-- Narratives ride with any help (reading-ux §5): knowing what
			     happens at the altar is word-level-grade help; translations
			     alone stay at the top step. -->
			{#if helpLevel >= 1 && gloss.segments[seg.id]?.narrative}
				<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
			{/if}
		</div>
	{:else}
		<p class="verse" class:glossed={helpLevel >= 1} lang="la">
			<!-- Word and its trailing punctuation form one atomic token
			     (inline-block): the line breaker may only break at the
			     spaces BETWEEN tokens, never between a word and its
			     comma or period. Guarded by the one-rect e2e invariant. -->
			{#each seg.words ?? [] as w (w.id)}<span class="token"
					>{#if ontap}<button
							class="word"
							id={w.id}
							class:selected={selectedId === w.id}
							onclick={() => ontap?.(w.id)}>{@render face(w.id, w.form)}</button
						>{:else}<span class="word">{@render face(w.id, w.form)}</span>{/if}{w.post ?? ''}</span
				>{' '}{/each}
		</p>
		{#if helpLevel >= 2 && gloss.segments[seg.id]?.translation}
			<div class="seg-extra">
				<p class="translation">{gloss.segments[seg.id].translation}</p>
			</div>
		{/if}
	{/if}
{/each}

<style>
	.verse {
		font-size: 1.45rem;
		line-height: 1.75;
		margin: 0 0 1.1rem;
	}

	.verse.glossed {
		line-height: 2.7;
	}

	.token {
		display: inline-block;
	}

	.word {
		font: inherit;
		background: none;
		border: none;
		padding: 0 0.1rem;
		margin: 0;
		border-radius: 0.25rem;
		color: inherit;
	}

	button.word {
		cursor: pointer;
	}

	button.word:hover {
		background: var(--wash);
	}

	button.word.selected {
		background: var(--wash-strong);
	}

	button.word:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}

	ruby {
		ruby-position: under;
	}

	rt {
		font-size: 0.55em;
		font-style: italic;
		color: var(--ink-soft);
		letter-spacing: 0.01em;
	}

	.rubric {
		margin: 0 0 1.1rem;
		border-inline-start: 2px solid var(--rubric);
		padding-inline-start: 0.9rem;
	}

	.rubric-la {
		margin: 0;
		color: var(--rubric);
		font-style: italic;
		font-size: 1.05rem;
	}

	.rubric-narrative {
		margin: 0.25rem 0 0;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.5;
	}

	/* Translations get the same typographic treatment as rubric narratives —
	   a thin vertical hairline with an indent — so the page stays layered
	   text, not cards: red hairline = what happens, neutral = what it means. */
	.seg-extra {
		margin: -0.45rem 0 1.4rem;
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: 0.9rem;
	}

	.translation {
		margin: 0;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1.55;
	}
</style>

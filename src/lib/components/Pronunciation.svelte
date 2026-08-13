<script lang="ts">
	// How a word is said: its syllables, then the transcription. The Polish
	// interface shows both traditions where they differ — what a reader
	// hears at their parish against what the schola sings — and the English
	// interface shows Roman alone. Never stored, always derived.
	//
	// The word panel and the lemma page had a copy each, and they had
	// already drifted: only one of them named the labels for a reader who
	// hovers them. WordIdentity now decides the placement around this one
	// pronunciation line.
	import { M, type Lang } from '$lib/i18n';
	import { pronunciations, syllabized } from '$lib/pronunciation';

	let { form, lang }: { form: string; lang: Lang } = $props();
	const pron = $derived(pronunciations(form));
	const hint = $derived(M[lang].pronunciationHint);
</script>

<p class="pron">
	<span class="syllables" lang="la">{syllabized(form)}</span>
	{#if lang === 'pl' && pron.differ}
		<span class="pron-unit">
			· <a href="/app/{lang}/grammatica/pronuntiatio" title={hint}
				><span class="smallcaps">rz.</span> /{pron.roman}/</a
			>
		</span>
		<span class="pron-unit">
			· <a href="/app/{lang}/grammatica/pronuntiatio" title={hint}
				><span class="smallcaps">pol.</span> /{pron.polish}/</a
			>
		</span>
	{:else}
		<span class="pron-unit">
			· <a href="/app/{lang}/grammatica/pronuntiatio" title={hint}>/{pron.roman}/</a>
		</span>
	{/if}
</p>

<style>
	.pron {
		margin: 0.3rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.pron a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	.pron a:hover {
		color: var(--ink);
	}

	/* A transcription is one word-shaped reading aid. If it no longer fits
	   beside the syllables, move the whole labelled unit to the next line;
	   splitting inside /…/ makes the IPA look like two separate forms. The
	   middot belongs to the unit as well, so it cannot be orphaned above it. */
	.syllables,
	.pron-unit {
		display: inline-block;
		white-space: nowrap;
	}

	.pron .smallcaps {
		font-size: 0.75rem;
	}
</style>

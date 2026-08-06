<script lang="ts">
	// How a word is said: its syllables, then the transcription. The Polish
	// interface shows both traditions where they differ — what a reader
	// hears at their parish against what the schola sings — and the English
	// interface shows Roman alone. Never stored, always derived.
	//
	// The word panel and the lemma page had a copy each, and they had
	// already drifted: only one of them named the labels for a reader who
	// hovers them.
	import { M, type Lang } from '$lib/i18n';
	import { pronunciations, syllabized } from '$lib/pronunciation';

	// The lemma page centres its head block; the word panel sets it ranged
	// left. That is the only difference there ever was between the two.
	let { form, lang, centered = false }: { form: string; lang: Lang; centered?: boolean } = $props();
	const pron = $derived(pronunciations(form));
	const hint = $derived(M[lang].pronunciationHint);
</script>

<p class="pron" class:centered>
	<span lang="la">{syllabized(form)}</span>
	{#if lang === 'pl' && pron.differ}
		· <a href="/{lang}/grammatica/pronuntiatio" title={hint}
			><span class="smallcaps">rz.</span> /{pron.roman}/</a
		>
		·
		<a href="/{lang}/grammatica/pronuntiatio" title={hint}
			><span class="smallcaps">pol.</span> /{pron.polish}/</a
		>
	{:else}
		· <a href="/{lang}/grammatica/pronuntiatio" title={hint}>/{pron.roman}/</a>
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

	.pron .smallcaps {
		font-size: 0.75rem;
	}

	.centered {
		text-align: center;
	}
</style>

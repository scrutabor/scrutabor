<script lang="ts">
	import WordPanel from '$lib/components/WordPanel.svelte';
	import type { Analysis, LemmaEntry, SenseEntry, Word, WordGloss } from '$lib/corpus';
	import type { Lang } from '$lib/i18n';

	let {
		word,
		gloss,
		analysis,
		lex,
		lang,
		onclose,
		onnavigate,
		idPrefix = ''
	}: {
		word: Word | null;
		gloss: WordGloss | null;
		analysis: Analysis | null;
		lex: { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> };
		lang: Lang;
		onclose?: () => void;
		onnavigate: (id: string) => void;
		idPrefix?: string;
	} = $props();
</script>

{#if word && analysis}
	<WordPanel
		{word}
		{gloss}
		{analysis}
		{lex}
		{lang}
		{onclose}
		onnavigate={(id) => onnavigate(idPrefix ? `${idPrefix}.${id}` : id)}
	/>
{/if}

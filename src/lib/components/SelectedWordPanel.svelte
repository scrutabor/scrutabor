<script lang="ts">
	import WordPanel from '$lib/components/WordPanel.svelte';
	import type { Lexicon, Word } from '$lib/corpus';
	import type { Lang } from '$lib/i18n';
	import type { WordPanelSelection } from '$lib/wordpanel.svelte';

	let {
		word,
		details,
		lex,
		lang,
		onclose,
		onnavigate,
		idPrefix = ''
	}: {
		word: Word | null;
		details: WordPanelSelection | null;
		lex: Lexicon;
		lang: Lang;
		onclose?: () => void;
		onnavigate: (id: string) => void;
		idPrefix?: string;
	} = $props();
</script>

{#if word && details}
	<WordPanel
		{word}
		gloss={details.gloss}
		analysis={details.analysis}
		{lex}
		{lang}
		{onclose}
		construction={details.construction}
		onnavigate={(id) => onnavigate(idPrefix ? `${idPrefix}.${id}` : id)}
	/>
{/if}

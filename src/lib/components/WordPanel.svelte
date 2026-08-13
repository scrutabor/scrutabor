<script lang="ts">
	// The word analysis as the reading surfaces present it: WordCard's
	// content in the shared sheet, dismissed like every other sheet.
	import Sheet from '$lib/components/Sheet.svelte';
	import WordCard from '$lib/components/WordCard.svelte';
	import WordIdentity from '$lib/components/WordIdentity.svelte';
	import type { Analysis, LemmaEntry, SenseEntry, Word, WordGloss } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';

	let {
		word,
		gloss,
		analysis,
		lex,
		lang,
		onclose,
		onnavigate,
		inline = false
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		lex: { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> };
		lang: Lang;
		onclose?: () => void;
		onnavigate: (id: string) => void;
		/** The landing keeps the panel open as part of the page; every other
		 * surface uses the dismissible bottom-sheet placement. */
		inline?: boolean;
	} = $props();
</script>

{#snippet lead()}
	<WordIdentity form={word.form} {lang} level={2} />
{/snippet}

<!-- the reading page pads its foot to this height so the tapped word is
     never left underneath the sheet — see .panel-open -->
<Sheet
	{lang}
	{onclose}
	label={M[lang].panelAria}
	extra={inline ? 'panel word-panel-inline' : 'panel'}
	max="45vh"
	{lead}
	{inline}
>
	<div class="word-analysis">
		<WordCard {word} {gloss} {analysis} {lex} {lang} {onnavigate} />
	</div>
</Sheet>

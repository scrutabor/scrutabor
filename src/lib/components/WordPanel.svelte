<script lang="ts">
	// The word analysis as the reading surfaces present it: WordCard's
	// content in the shared sheet, dismissed like every other sheet.
	import Sheet from '$lib/components/Sheet.svelte';
	import WordCard from '$lib/components/WordCard.svelte';
	import WordIdentity from '$lib/components/WordIdentity.svelte';
	import type { Analysis, Lexicon, Word, WordGloss } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import type { WordConstruction } from '$lib/word-construction';

	let {
		word,
		gloss,
		analysis,
		lex,
		lang,
		onclose,
		onnavigate,
		construction = null,
		inline = false
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		lex: Lexicon;
		lang: Lang;
		onclose?: () => void;
		onnavigate: (id: string) => void;
		construction?: WordConstruction | null;
		/** The landing keeps the panel open as part of the page; every other
		 * surface uses the dismissible bottom-sheet placement. */
		inline?: boolean;
	} = $props();
</script>

{#snippet lead()}
	<WordIdentity
		form={construction ? construction.parts.map((part) => part.word.form).join(' ') : word.form}
		{lang}
		level={2}
		showPronunciation={!construction}
	/>
{/snippet}

<!-- the reading page pads its foot to this height so the tapped word is
     never left underneath the sheet — see .panel-open -->
<Sheet
	{lang}
	{onclose}
	label={construction ? M[lang].constructionPanelAria : M[lang].panelAria}
	extra={inline ? 'panel word-panel-inline' : 'panel'}
	max="45vh"
	{lead}
	{inline}
>
	<div class="word-analysis">
		<WordCard {word} {gloss} {analysis} {lex} {lang} {onnavigate} {construction} />
	</div>
</Sheet>

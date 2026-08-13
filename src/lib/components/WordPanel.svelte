<script lang="ts">
	// The word analysis as the reading surfaces present it: WordCard's
	// content in the shared sheet, dismissed like every other sheet.
	import Sheet from '$lib/components/Sheet.svelte';
	import Pronunciation from '$lib/components/Pronunciation.svelte';
	import WordCard from '$lib/components/WordCard.svelte';
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
	<div class="word-lead">
		<h2 class="form" lang="la">{word.form}</h2>
		<div class="pronunciation-lead">
			<Pronunciation form={word.form} {lang} />
		</div>
	</div>
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

<style>
	.word-lead {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: baseline;
		gap: 1rem;
		min-width: 0;
		flex: 1;
		text-align: left;
	}

	.form {
		margin: 0;
		font-size: 1.7rem;
		font-weight: 500;
		text-align: left;
	}

	.pronunciation-lead {
		min-width: 0;
		text-align: left;
	}

	@media (max-width: 36rem) {
		.word-lead {
			display: block;
		}
	}
</style>

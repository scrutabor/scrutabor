<script lang="ts">
	// The word analysis as the reading surfaces present it: WordCard's
	// content in the shared sheet, dismissed like every other sheet.
	import Sheet from '$lib/components/Sheet.svelte';
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
		onnavigate
	}: {
		word: Word;
		gloss: WordGloss | null;
		analysis: Analysis;
		lex: { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> };
		lang: Lang;
		onclose: () => void;
		onnavigate: (id: string) => void;
	} = $props();
</script>

{#snippet lead()}
	<span class="form" lang="la">{word.form}</span>
{/snippet}

<!-- the reading page pads its foot to this height so the tapped word is
     never left underneath the sheet — see .panel-open -->
<Sheet {lang} {onclose} label={M[lang].panelAria} extra="panel" max="45vh" {lead}>
	<WordCard {word} {gloss} {analysis} {lex} {lang} {onnavigate} />
</Sheet>

<style>
	.form {
		font-size: 1.7rem;
		font-weight: 500;
	}
</style>

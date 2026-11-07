<script lang="ts">
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import { M, type Lang } from '$lib/i18n';

	let {
		lemma,
		lang,
		expected = false
	}: {
		lemma: string;
		lang: Lang;
		/** The page lexicon marks the lemma as sourced (LemmaEntry.sources). */
		expected?: boolean;
	} = $props();
	const sources = $derived(loadSources(lang, lemma));

	// The loading line waits 200 ms. From the cache the lazy module arrives a
	// frame or two after the panel, and a line that appeared and vanished in
	// that time would move the rows below it on every selection.
	const STATUS_DELAY_MS = 200;
	let waited = $state(false);
	$effect(() => {
		void sources;
		waited = false;
		const timer = setTimeout(() => (waited = true), STATUS_DELAY_MS);
		return () => clearTimeout(timer);
	});

	async function loadSources(language: Lang, lemmaId: string) {
		// Keep the edition metadata out of a reading page's initial bundle.
		// Snapshot the reactive inputs before awaiting the lazy module.
		const { loadLemmaSupport } = await import('$lib/bibliography');
		return loadLemmaSupport(language, lemmaId);
	}

	function retrySources() {
		// A failed module import can remain cached in the browser. Reload the
		// current selection with a fresh module graph, as on the lemma page.
		location.reload();
	}
</script>

<div class="lemma-sources" class:expected data-lemma={lemma}>
	{#await sources}
		{#if expected && waited}
			<p class="source-status" role="status">{M[lang].lemmaSourcesLoading}</p>
		{/if}
	{:then citations}
		<span hidden data-source-state="loaded"></span>
		{#if citations.length}
			<SourceNotes
				{citations}
				{lang}
				label={M[lang].lemmaSourcesLabel}
				scope={M[lang].lemmaSourcesScope}
			/>
		{/if}
	{:catch}
		<p class="source-status" role="alert">
			{M[lang].lemmaSourcesFailed}
			<button type="button" onclick={retrySources}>{M[lang].updateReload}</button>
		</p>
	{/await}
</div>

<style>
	/* Most lemmata have no dictionary source: their entry row ends at its
	   last line and the form row follows at the rows' usual distance. A
	   lemma the edition marks as sourced holds the closed sources line's
	   room from the first frame, because the panel lifts the tapped word
	   clear of the sheet in that frame and the line must not grow the
	   sheet afterwards. The room is SourceNotes' closed line: its 0.78rem
	   top margin and one 0.72rem line at line-height 1.45. The loading and
	   failure lines fit inside it. */
	.lemma-sources {
		display: flow-root;
	}

	.lemma-sources.expected {
		min-block-size: calc(0.78rem + 0.72rem * 1.45);
	}

	.source-status {
		margin: 0.65rem 0 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.45;
	}

	button {
		margin-inline-start: 0.4rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--rubric);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	@media print {
		.lemma-sources {
			display: none;
		}
	}
</style>

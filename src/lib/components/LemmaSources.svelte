<script lang="ts">
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import { M, type Lang } from '$lib/i18n';

	let { lemma, lang }: { lemma: string; lang: Lang } = $props();
	const sources = $derived(loadSources(lang, lemma));

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

<div class="lemma-sources" data-lemma={lemma}>
	{#await sources}
		<p class="source-status" role="status">{M[lang].lemmaSourcesLoading}</p>
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
	.lemma-sources {
		display: flow-root;
		min-block-size: 2.15rem;
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

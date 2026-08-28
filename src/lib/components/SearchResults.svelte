<script lang="ts">
	import { M, type Lang } from '$lib/i18n';
	import SearchOutcome from '$lib/components/SearchOutcome.svelte';
	import SearchResultLink from '$lib/components/SearchResultLink.svelte';
	import SearchTitleResults from '$lib/components/SearchTitleResults.svelte';
	import type { SearchResults } from '$lib/search';

	let {
		lang,
		results,
		pending = false,
		failed = false,
		onretry,
		onResult
	}: {
		lang: Lang;
		results: SearchResults | null;
		pending?: boolean;
		failed?: boolean;
		onretry?: () => void;
		onResult?: (event: Event) => void;
	} = $props();

	const msgs = $derived(M[lang]);
	const count = $derived(
		(results?.titles.length ?? 0) + (results?.contents.length ?? 0) + (results?.grammar.length ?? 0)
	);
</script>

<SearchOutcome
	{lang}
	statusId="search-status"
	{pending}
	{failed}
	{onretry}
	degraded={results?.degraded ?? false}
	ready={results !== null}
	empty={count === 0}
	{count}
>
	{#if results}
		{#if results.titles.length}
			<section aria-labelledby="search-titles">
				<h2 id="search-titles" class="smallcaps">{msgs.searchTitles}</h2>
				<SearchTitleResults {lang} results={results.titles} saveBeforeNavigation {onResult} />
			</section>
		{/if}

		{#if results.grammar.length}
			<section aria-labelledby="search-grammar">
				<h2 id="search-grammar" class="smallcaps">{msgs.searchGrammar}</h2>
				<ul class="search-results-list">
					{#each results.grammar as result (result.lemma)}
						<li>
							<SearchResultLink href={result.href} saveBeforeNavigation {onResult}>
								<strong lang="la">{result.head}</strong>
								{#if result.senses.length}<span class="search-result-detail snippet"
										>{result.senses.join(' · ')}</span
									>{/if}
							</SearchResultLink>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if results.contents.length}
			<section aria-labelledby="search-contents">
				<h2 id="search-contents" class="smallcaps">{msgs.searchContents}</h2>
				<ul class="search-results-list">
					{#each results.contents as result (`${result.source}:${result.textKey}:${result.segmentId}`)}
						<li>
							<SearchResultLink href={result.href} saveBeforeNavigation {onResult}>
								<strong>{result.title}</strong>
								<span
									class="search-result-detail snippet"
									lang={result.source === 'la' ? 'la' : lang}
									>{#each result.parts as part, index (`${index}:${part.hit}`)}{#if part.hit}<mark
												>{part.text}</mark
											>{:else}{part.text}{/if}{/each}</span
								>
							</SearchResultLink>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</SearchOutcome>

<style>
	section + section {
		margin-top: 1.65rem;
	}

	h2 {
		margin: 0 0 0.5rem;
		color: var(--ink-soft);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-align: start;
	}

	.snippet {
		line-height: 1.4;
	}

	mark {
		padding-inline: 0.04em;
		border-radius: 0.1rem;
		background: var(--wash-strong);
		color: inherit;
	}
</style>

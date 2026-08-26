<script lang="ts">
	import { M, type Lang } from '$lib/i18n';
	import SearchResultLink from '$lib/components/SearchResultLink.svelte';
	import type { TitleSearchResult } from '$lib/search';

	let {
		lang,
		results,
		compact = false,
		saveBeforeNavigation = false,
		onResult
	}: {
		lang: Lang;
		results: TitleSearchResult[];
		compact?: boolean;
		saveBeforeNavigation?: boolean;
		onResult?: (event: Event) => void;
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<ul class="search-results-list" class:compact>
	{#each results as result (result.textKey)}
		<li>
			<SearchResultLink {compact} href={result.href} {saveBeforeNavigation} {onResult}>
				{#if !compact}<span class="search-result-badge">{msgs.searchResultTitle}</span>{/if}
				<strong>{result.title}</strong>
				{#if result.latinTitle !== result.title}<span class="search-result-detail" lang="la"
						>{result.latinTitle}</span
					>{/if}
				{#if !compact && result.matchedAlias}<span class="search-result-detail"
						>{msgs.searchMatchedAlias}: {result.matchedAlias}</span
					>{/if}
				<span class="search-result-detail search-result-context smallcaps">{result.context}</span>
			</SearchResultLink>
		</li>
	{/each}
</ul>

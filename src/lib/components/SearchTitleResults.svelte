<script lang="ts">
	import { M, type Lang } from '$lib/i18n';
	import SearchResultLink from '$lib/components/SearchResultLink.svelte';
	import type { TitleSearchResult } from '$lib/search';

	let {
		lang,
		results,
		saveBeforeNavigation = false,
		onResult
	}: {
		lang: Lang;
		results: TitleSearchResult[];
		saveBeforeNavigation?: boolean;
		onResult?: (event: Event) => void;
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<ul class="search-results-list">
	{#each results as result (result.textKey)}
		<li>
			<SearchResultLink href={result.href} {saveBeforeNavigation} {onResult}>
				<strong>{result.title}</strong>
				{#if result.latinTitle !== result.title}<span class="search-result-detail" lang="la"
						>{result.latinTitle}</span
					>{/if}
				{#if result.matchedAlias}<span class="search-result-detail matched-alias"
						>{msgs.searchMatchedAlias}: {result.matchedAlias}</span
					>{/if}
			</SearchResultLink>
		</li>
	{/each}
</ul>

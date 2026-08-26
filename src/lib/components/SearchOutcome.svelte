<script lang="ts">
	import type { Snippet } from 'svelte';
	import { M, type Lang } from '$lib/i18n';

	let {
		lang,
		statusId,
		pending,
		failed,
		ready,
		empty,
		count,
		children
	}: {
		lang: Lang;
		statusId: string;
		pending: boolean;
		failed: boolean;
		ready: boolean;
		empty: boolean;
		count: number;
		children: Snippet;
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<p id={statusId} class="sr-only" role="status" aria-live="polite">
	{pending ? msgs.searchLoading : ready ? msgs.searchCount(count) : ''}
</p>

<div class="results search-page-results" aria-busy={pending}>
	{#if failed}
		<p class="empty">{msgs.searchFailed}</p>
	{:else if pending && !ready}
		<p class="empty">{msgs.searchLoading}</p>
	{:else if ready && empty}
		<p class="empty">{msgs.searchNoResults}</p>
	{:else if ready}
		{@render children()}
	{/if}
</div>

<style>
	.results.search-page-results {
		padding-block: 0.35rem 3rem;
	}

	.empty {
		margin: 2.4rem 0;
		color: var(--ink-soft);
		text-align: center;
	}
</style>

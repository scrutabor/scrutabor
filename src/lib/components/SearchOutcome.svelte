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
		variant = 'page',
		children
	}: {
		lang: Lang;
		statusId: string;
		pending: boolean;
		failed: boolean;
		ready: boolean;
		empty: boolean;
		count: number;
		variant?: 'page' | 'dialog';
		children: Snippet;
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<p id={statusId} class="sr-only" role="status" aria-live="polite">
	{pending ? msgs.searchLoading : ready ? msgs.searchCount(count) : ''}
</p>

<div
	class="results {variant === 'page' ? 'search-page-results' : 'search-dialog-results'}"
	aria-busy={pending}
>
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

	.results.search-dialog-results {
		min-height: 3.5rem;
		overflow-y: auto;
		padding-inline: 1.25rem;
		overscroll-behavior: contain;
	}

	.empty {
		margin: 2.4rem 0;
		color: var(--ink-soft);
		text-align: center;
	}

	.search-dialog-results .empty {
		margin-block: 1.2rem;
	}

	@media (max-width: 28rem) {
		.results.search-dialog-results {
			padding-inline: 0.75rem;
		}
	}
</style>

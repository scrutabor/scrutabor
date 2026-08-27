<script lang="ts">
	import type { Snippet } from 'svelte';
	import { M, type Lang } from '$lib/i18n';

	let {
		lang,
		statusId,
		pending,
		failed,
		degraded = false,
		ready,
		empty,
		count,
		onretry,
		children
	}: {
		lang: Lang;
		statusId: string;
		pending: boolean;
		failed: boolean;
		degraded?: boolean;
		ready: boolean;
		empty: boolean;
		count: number;
		onretry?: () => void;
		children: Snippet;
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<!-- A failure is announced as a failure. The previous run's count is the one
     thing this line must never say then: a screen-reader user would hear a
     healthy number over a broken pane. -->
<p id={statusId} class="sr-only" role="status" aria-live="polite">
	{pending ? msgs.searchLoading : failed ? msgs.searchFailed : ready ? msgs.searchCount(count) : ''}
</p>

<div class="results search-page-results" aria-busy={pending}>
	{#if failed}
		<p class="empty">
			{msgs.searchFailed}
			{#if onretry}
				<button type="button" class="retry" onclick={onretry}>{msgs.searchRetry}</button>
			{/if}
		</p>
	{:else if pending && !ready}
		<p class="empty">{msgs.searchLoading}</p>
	{:else if ready && empty}
		<p class="empty">{msgs.searchNoResults}</p>
	{:else if ready}
		{#if degraded}
			<p class="degraded">{msgs.searchDegraded}</p>
		{/if}
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

	.degraded {
		margin: 0.6rem 0 1.2rem;
		color: var(--ink-soft);
		font-size: 0.84rem;
		text-align: center;
	}

	.retry {
		margin-left: 0.35rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent, inherit);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>

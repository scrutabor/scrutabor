<script lang="ts">
	import type { Snippet } from 'svelte';
	import ContentLoader from '$lib/components/ContentLoader.svelte';
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

<div class="results search-page-results" class:updating={pending && ready} aria-busy={pending}>
	{#if pending && ready}
		<span class="update-progress" aria-hidden="true"><span></span></span>
	{/if}
	{#if failed}
		<p class="empty">
			{msgs.searchFailed}
			{#if onretry}
				<button type="button" class="retry" onclick={onretry}>{msgs.searchRetry}</button>
			{/if}
		</p>
	{:else if pending && !ready}
		<ContentLoader variant="search" />
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
		position: relative;
		padding-block: 0.35rem 3rem;
	}

	.results.updating > :not(.update-progress) {
		opacity: 0.72;
		transition: opacity 120ms ease;
	}

	.update-progress {
		position: absolute;
		z-index: 1;
		top: 0;
		inset-inline: 0;
		height: 2px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--wash);
	}

	.update-progress span {
		display: block;
		width: 34%;
		height: 100%;
		border-radius: inherit;
		background: var(--rubric);
		animation: search-progress 1.15s ease-in-out infinite;
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

	@keyframes search-progress {
		0% {
			transform: translateX(-110%);
		}

		100% {
			transform: translateX(305%);
		}
	}
</style>

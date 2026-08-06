<script lang="ts">
	// What the red marks beside the lines mean, opened by tapping one.
	//
	// It began as a tooltip on the mark, and the owner's verdict was that a
	// help cursor with a slow native tooltip invites a click and then does
	// nothing — the worst of both. A mark is a thing you can ask about, so
	// it is a button, and this is the answer: the whole key at once, since a
	// reader who does not know what V. means does not know what R. means
	// either.
	import { M, type Lang } from '$lib/i18n';

	let { lang, onclose }: { lang: Lang; onclose: () => void } = $props();
	const msgs = $derived(M[lang]);
	const KEYS = ['sacerdos', 'minister', 'omnes'] as const;
</script>

<aside class="legend" aria-label={msgs.markLegendTitle}>
	<div class="inner">
		<header>
			<span class="smallcaps title">{msgs.markLegendTitle}</span>
			<button class="close" onclick={onclose} aria-label={msgs.close}>×</button>
		</header>
		<dl>
			{#each KEYS as k (k)}
				<div class="row">
					<dt class="mark" lang="la">{k === 'sacerdos' ? 'V.' : k === 'minister' ? 'R.' : 'O.'}</dt>
					<dd>{msgs.markTitle[k]}</dd>
				</div>
			{/each}
		</dl>
		<p class="note">{msgs.markLegendNote}</p>
	</div>
</aside>

<style>
	/* The same bottom sheet the introduction and the word panel use: the
	   reading column never reflows for it. */
	.legend {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		background: var(--bg);
		border-top: 1px solid var(--border);
		box-shadow: 0 -0.5rem 1.5rem rgb(0 0 0 / 8%);
		max-height: 60vh;
		overflow-y: auto;
	}

	.inner {
		max-width: 34rem;
		margin: 0 auto;
		padding: 1rem 1.2rem 1.6rem;
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.title {
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	.close {
		appearance: none;
		border: 0;
		background: none;
		color: var(--ink-soft);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.3rem;
	}

	.close:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}

	dl {
		margin: 0.8rem 0 0;
	}

	.row {
		display: flex;
		gap: 0.9rem;
		align-items: baseline;
		padding: 0.35rem 0;
	}

	dt.mark {
		flex: none;
		width: 2rem;
		color: var(--rubric);
		font-size: 1.05rem;
	}

	dd {
		margin: 0;
		color: var(--ink);
	}

	.note {
		margin: 0.9rem 0 0;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}
</style>

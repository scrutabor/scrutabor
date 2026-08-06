<script lang="ts">
	// What the red marks beside the lines mean, opened by tapping one.
	//
	// It began as a tooltip on the mark, and the owner's verdict was that a
	// help cursor with a slow native tooltip invites a click and then does
	// nothing — the worst of both. A mark is a thing you can ask about, so
	// it is a button, and this is the answer: the whole key at once, since a
	// reader who does not know what V. means does not know what R. means
	// either. The sheet it arrives on is the shared one.
	import Sheet from '$lib/components/Sheet.svelte';
	import { M, type Lang } from '$lib/i18n';

	let { lang, onclose }: { lang: Lang; onclose: () => void } = $props();
	const msgs = $derived(M[lang]);
	const KEYS = ['sacerdos', 'minister', 'omnes'] as const;
</script>

<Sheet
	{lang}
	{onclose}
	label={msgs.markLegendTitle}
	title={msgs.markLegendTitle}
	extra="legend"
	max="45vh"
>
	<dl>
		{#each KEYS as k (k)}
			<div class="row">
				<dt class="mark" lang="la">{k === 'sacerdos' ? 'V.' : k === 'minister' ? 'R.' : 'O.'}</dt>
				<dd>{msgs.markTitle[k]}</dd>
			</div>
		{/each}
	</dl>
	<p class="note">{msgs.markLegendNote}</p>
</Sheet>

<style>
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

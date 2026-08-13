<script lang="ts">
	// A quiet label beside analysis prose. The word panel and lemma summary
	// use the same row so their label width, rules and phone stacking cannot
	// drift while the two surfaces grow independently.
	import type { Snippet } from 'svelte';

	let {
		label,
		id,
		level = 3,
		first = false,
		children
	}: { label: string; id: string; level?: 2 | 3; first?: boolean; children: Snippet } = $props();

	const tag = $derived(level === 2 ? 'h2' : 'h3');
</script>

<section class="layer" class:first aria-labelledby={id}>
	<svelte:element this={tag} class="layer-label smallcaps" {id}>{label}</svelte:element>
	<div class="layer-body">{@render children()}</div>
</section>

<style>
	.layer {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		column-gap: 0.8rem;
		margin: 0.75rem 0 0;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border);
	}

	.layer.first {
		margin-top: 0;
		padding-top: 0;
		border-top: 0;
	}

	.layer-label {
		margin: 0;
		color: var(--ink-soft);
		font-family: 'EB Garamond Label', 'EB Garamond', serif;
		font-size: 0.7rem;
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.11em;
		text-align: left;
	}

	.layer-body {
		min-width: 0;
	}

	@media (max-width: 36rem) {
		.layer {
			display: block;
			grid-column: auto;
		}

		.layer-body {
			margin-top: 0.25rem;
		}
	}
</style>

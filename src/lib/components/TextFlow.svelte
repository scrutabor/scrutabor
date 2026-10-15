<script lang="ts">
	import type { Snippet } from 'svelte';
	import { rowEnd, rowStart, type FlowRow, type FlowUnit } from '$lib/text-flow';
	let {
		units,
		row,
		helpLevel,
		litanyColumns,
		responseRow,
		preceding,
		following,
		sourcesAfter = false,
		sourcesBefore = false
	}: {
		units: FlowUnit[];
		row: Snippet<[FlowRow]>;
		helpLevel: number;
		litanyColumns: boolean;
		responseRow?: number;
		/** The row rendered just before this flow by another body of the
		 * same slot, or the opening of the same text. With it the first row
		 * is a partition start: its margin is priced against that row and
		 * not zeroed as the slot's edge. */
		preceding?: FlowRow;
		/** The row rendered just after this flow by another body of the same
		 * slot. With it the last row keeps its tail and knows what follows. */
		following?: FlowRow;
		/** On screen a translation-sources block stands after the last row of
		 * this flow (`sourcesAfter`) or before its first row (`sourcesBefore`):
		 * the block prices that seam with its own margins there, so the row
		 * margin next to it is neutralised in screen media only. Paper does
		 * not print the block, and the neighbour link prices the seam. */
		sourcesAfter?: boolean;
		sourcesBefore?: boolean;
	} = $props();
	const firstIndex = $derived(units[0]?.rows[0]?.index);
</script>

{#snippet flow()}
	{#each units as unit (unit.key)}
		<div class="flow-unit" class:keep={unit.keep} data-kind={unit.kind}>
			{#each unit.rows as item (item.index)}
				<div
					class="flow-row"
					class:first={item.first && preceding === undefined}
					class:last={item.last && following === undefined}
					class:study={helpLevel === 1}
					class:terminal={item.terminal}
					class:response={item.index === responseRow}
					class:partition-start={preceding !== undefined && item.index === firstIndex}
					class:sources-before={sourcesBefore &&
						preceding !== undefined &&
						item.index === firstIndex}
					class:sources-after={sourcesAfter && following !== undefined && item.last}
					data-before={item.before ??
						(preceding !== undefined && item.index === firstIndex ? rowEnd(preceding) : null)}
					data-after={item.after ??
						(following !== undefined && item.last ? rowStart(following) : null)}
				>
					{@render row(item)}
				</div>
			{/each}
		</div>
	{/each}
{/snippet}

{#if !units.length}
	<!-- An empty partition emits no extra measure or container. -->
{:else if helpLevel === 2 && !litanyColumns}
	<div
		class="bilingual"
		class:partition={preceding !== undefined}
		style:--previous-tail={preceding?.translated
			? 'calc(var(--reading-bare) * 0.9)'
			: 'calc(var(--reading-bare) * 0.62)'}
		style:--previous-print-tail={preceding?.translated
			? 'calc(var(--reading) * 0.32)'
			: 'calc(var(--reading) * 0.42)'}
	>
		<div class="columns">{@render flow()}</div>
	</div>
{:else if helpLevel === 0 && !litanyColumns}
	<div class="measure">{@render flow()}</div>
{:else}
	{@render flow()}
{/if}

<style>
	/* These wrappers carry print boundaries and full-document row metadata.
	   Their screen boxes vanish; Latin, translation and controls keep their
	   existing classes, ids and sibling order within each rendered row.

	   A row is `first` or `last` only at the slot's own edges. A body that
	   follows another body in the same slot receives that body's last row
	   as `preceding` and the one it precedes as `following`, so its edge
	   rows carry neighbour metadata and keep their margins: the seam between
	   two bodies is then priced by the same rules as any two rows of one
	   text; without the metadata a second body abutted the first in the bare
	   and bilingual faces. A translation-sources block between two bodies
	   keeps its own margins on screen, where the row margins next to it are
	   neutralised; paper does not print the block, so the link holds there. */
	.flow-unit,
	.flow-row {
		display: contents;
	}
	.bilingual {
		container: bilingual / inline-size;
	}
	.measure,
	.columns {
		max-width: 36rem;
		margin-inline: auto;
	}
	.columns .flow-row.first > :global(:first-child),
	.measure .flow-row.first > :global(:first-child) {
		margin-top: 0;
	}
	.columns .flow-row.last > :global(:last-child),
	.measure .flow-row.last > :global(:last-child),
	.columns .flow-row.last > :global(.verse:has(+ .seg-extra)) {
		margin-bottom: 0;
	}
	@media screen {
		.flow-row.sources-after > :global(:last-child),
		.columns .flow-row.sources-after > :global(.verse:has(+ .seg-extra)) {
			margin-bottom: 0;
		}
		.flow-row.sources-before > :global(:first-child),
		.bilingual.partition .flow-row.partition-start.sources-before > :global(.rubric),
		.bilingual.partition .flow-row.partition-start.sources-before > :global(.who) {
			margin-top: 0;
		}
	}
	.flow-row[data-before='hidden'] > :global(.who) {
		margin-top: 0.3rem;
	}
	.flow-row.study[data-before='verse'] > :global(.who:has(+ .verse.glossed)) {
		margin-top: calc(var(--reading) * (0.517 + var(--gloss-gap) + 0.86));
	}
	.flow-row.study[data-before='verse'] > :global(.rubric) {
		margin-top: calc(var(--reading) * 0.55);
	}
	.flow-row.study[data-after='verse'] > :global(.rubric) {
		margin-bottom: calc(var(--reading) * 0.85);
	}
	/* A new inline-size container cannot collapse a continuation's first
	   margin into the preceding partition. Spend only the complement of
	   that already-reserved tail; the resulting gap stays max(before,after). */
	.bilingual.partition .flow-row.partition-start > :global(.rubric) {
		margin-top: max(0px, calc(var(--reading) * (1 + var(--gloss-gap)) - var(--previous-tail)));
	}
	.bilingual.partition .flow-row.partition-start > :global(.who) {
		margin-top: max(0px, calc(var(--reading) * (0.517 + var(--gloss-gap)) - var(--previous-tail)));
	}
	@container bilingual (min-width: 44rem) {
		.columns {
			max-width: none;
			margin-inline: 0;
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			column-gap: 2.6rem;
			align-items: baseline;
		}
		.columns .flow-row > :global(*) {
			grid-column: 1 / -1;
		}
		.columns .flow-row > :global(.verse),
		.columns .flow-row > :global(.seg-extra) {
			margin-bottom: calc(var(--reading-bare) * 0.55);
		}
		.columns .flow-row > :global(.verse) {
			grid-column: 1;
			margin-top: 0;
		}
		.columns .flow-row > :global(.seg-extra) {
			grid-column: 2;
			margin-top: 0;
			padding-inline-start: 0;
		}
		.columns .flow-row > :global(.seg-extra .translation) {
			font-size: var(--reading-bare);
			line-height: 1.5;
			color: var(--ink);
		}
		.columns .flow-row[data-after='rubric'] > :global(.verse),
		.columns .flow-row[data-after='who'] > :global(.verse),
		.columns .flow-row[data-after='rubric'] > :global(.seg-extra),
		.columns .flow-row[data-after='who'] > :global(.seg-extra),
		.columns .flow-row.last > :global(.verse),
		.columns .flow-row.last > :global(.seg-extra) {
			margin-bottom: 0;
		}
		.columns .flow-row[data-before='rubric'] > :global(.who),
		.columns .flow-row[data-before='rubric'] > :global(.rubric) {
			margin-top: 0;
		}
		.columns .flow-row[data-before='rubric'] > :global(.rubric) {
			margin-top: calc(var(--reading) * var(--gloss-gap));
		}
		.bilingual.partition .flow-row.partition-start > :global(.rubric) {
			margin-top: calc(var(--reading) * (1 + var(--gloss-gap)));
		}
		.bilingual.partition .flow-row.partition-start > :global(.who) {
			margin-top: calc(var(--reading) * (0.517 + var(--gloss-gap)));
		}
	}
	@media print {
		.flow-unit {
			display: block;
			break-inside: auto;
		}
		.flow-unit.keep {
			break-inside: avoid;
		}
		/* A loose instruction's forward connection must cross its real unit
		   boundary, including before a long verse that may continue on paper. */
		.flow-unit[data-kind='row']:has(:global(.rubric)) {
			break-after: avoid;
		}
		.flow-unit[data-kind='terminal'] {
			break-before: avoid;
			break-after: auto;
		}
		.flow-unit[data-kind='row']:has(.flow-row.response) {
			break-before: avoid;
		}
		.flow-row.response > :global(:first-child) {
			break-before: avoid;
		}
		.flow-row > :global(.rubric) {
			break-after: avoid;
		}
		.flow-row.terminal > :global(.rubric) {
			break-before: avoid;
			break-after: auto;
		}
		.flow-row.study[data-before='verse'] > :global(.rubric),
		.flow-row.study[data-after='verse'] > :global(.rubric),
		.flow-row > :global(.rubric) {
			margin-top: calc(var(--reading) * 0.68);
			margin-bottom: calc(var(--reading) * 0.68);
		}
		.bilingual.partition .flow-row.partition-start > :global(.rubric) {
			margin-top: max(0px, calc(var(--reading) * 0.68 - var(--previous-print-tail)));
		}
		.bilingual.partition .flow-row.partition-start > :global(.who) {
			margin-top: max(0px, calc(var(--reading) * 0.5 - var(--previous-print-tail))) !important;
		}
	}
	@container bilingual (min-width: 44rem) {
		@media print {
			.columns > .flow-unit {
				display: grid;
				grid-column: 1 / -1;
				grid-template-columns: subgrid;
				align-items: baseline;
			}
			.bilingual.partition .flow-row.partition-start > :global(.rubric) {
				margin-top: calc(var(--reading) * 0.68);
			}
			.bilingual.partition .flow-row.partition-start > :global(.who) {
				margin-top: calc(var(--reading) * 0.5) !important;
			}
		}
	}
</style>

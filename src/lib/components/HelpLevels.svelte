<script lang="ts">
	// The reading mode: łacina, przekład, interlinearnie. It was a SLIDER
	// for its first year, and the slider outlived two meanings — built for
	// a hand-judged difficulty ladder (superseded 2026-08-03), reread as
	// additive help, and retired when the additive model died too (owner,
	// 2026-08-21): once full position became the bilingual view, the stops
	// were not "more" of anything but three different READINGS. It wore the
	// role picker's quiet clothes for a morning and a capsule for an
	// afternoon; the owner then chose the TABELLA (the D direction of the
	// 2026-08-21 canvas): every setting is a row of one framed table, and
	// this control is its first row — set apart by the surface tint and a
	// step of size, not by a different kind of object.
	//
	// DISPLAY ORDER is łacina · przekład · interlinearnie (owner): the
	// first two share the bare reading scale, so walking left to right the
	// type holds still once and changes once, at the study view. The word
	// is the genre's own (owner): Biblia interlinearna is the accepted
	// Polish name for exactly this kind of edition. The STORED values did
	// not change — 0, 1, 2 under scrutabor-help mean what they always
	// meant, so every reader's saved choice survives both the reordering
	// and the renaming.
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { radiogroupKeydown } from '$lib/radio-nav';
	import { readStored, writeStored } from '$lib/storage';

	// The fallback matches every page's own initial state (interlinearnie,
	// level 1) — the Ordo index renders this control unbound, and with a
	// different fallback a first visit showed przekład there while every
	// movement page opened at interlinearnie.
	let { lang, value = $bindable(1) }: { lang: Lang; value?: number } = $props();

	const LEVELS = [0, 2, 1] as const;

	onMount(() => {
		const raw = readStored('scrutabor-help');
		if (raw === null) return;
		const stored = Number(raw);
		if (Number.isInteger(stored)) value = Math.max(0, Math.min(stored, 2));
	});

	function choose(level: number) {
		value = level;
		writeStored('scrutabor-help', String(value));
	}

	let group = $state<HTMLElement | undefined>();
	const onGroupKey = radiogroupKeydown({
		options: () => LEVELS,
		current: () => value as 0 | 1 | 2,
		choose,
		group: () => group
	});
</script>

<div class="help row">
	<span class="label smallcaps" id="help-label">{M[lang].levelsLabel}</span>
	<!-- Roving tabindex, as in RolePicker: the checked radio is the one
	     tab stop and the arrows move the check (lib/radio-nav). -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="options"
		role="radiogroup"
		aria-labelledby="help-label"
		bind:this={group}
		onkeydown={onGroupKey}
	>
		{#each LEVELS as level (level)}
			<button
				type="button"
				role="radio"
				aria-checked={value === level}
				tabindex={value === level ? 0 : -1}
				class="option"
				class:on={value === level}
				data-level={level}
				onclick={() => choose(level)}
			>
				<span class="slot">
					<span class="ghost" aria-hidden="true">{M[lang].levels[level]}</span>
					<span class="real">{M[lang].levels[level]}</span>
				</span>
			</button>
		{/each}
	</div>
</div>

<style>
	/* THE TABELLA'S FIRST ROW. The one control that changes what the page
	   IS leads the framed table every reading surface carries (.tabella,
	   app.css): the label column shared with the rows below, the choice as
	   words with the reader's own in the rubric, the row itself lifted by
	   the surface tint and one step of size. The ghost under each word
	   holds the width of its emphasized form so the row never changes
	   shape as the choice moves (RolePicker documents the device). */
	.options {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		font-size: 1rem;
	}

	/* The squeezed table (the row skeleton in app.css stacks the label):
	   at 320px under the 140% root the three mode words need every pixel
	   the frame can give, so they give back one step of size. */
	@container help (max-width: 26rem) {
		.options {
			font-size: 0.9rem;
			/* safe: if a future word ever outgrows the frame, one edge
			   clips and the other stays reachable — plain center hides
			   both ends at once */
			justify-content: safe center;
			/* the three words are ONE line by contract (the text-size suite
			   pins it): unbreakable, so the table sizes to them instead of
			   folding them */
			flex-wrap: nowrap;
		}
	}
</style>

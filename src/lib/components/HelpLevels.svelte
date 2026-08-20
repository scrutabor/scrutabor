<script lang="ts">
	// The reading mode: łacina, słowa, przekład. It was a SLIDER for its
	// first year, and the slider outlived two meanings — built for a
	// hand-judged difficulty ladder (superseded 2026-08-03), reread as
	// additive help, and retired when the additive model died too (owner,
	// 2026-08-21): once full position became the bilingual view, the stops
	// were not "more" of anything but three different READINGS, and a
	// slider whose positions are modes is a segmented control in a slider's
	// costume. Now it is what the row's other settings already were — a
	// question answered with a word, in the role picker's own clothes.
	//
	// The stored key and its values did not change: 0, 1, 2 under
	// scrutabor-help, so every reader's saved choice survives the control.
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { radiogroupKeydown } from '$lib/radio-nav';
	import { readStored, writeStored } from '$lib/storage';

	let { lang, value = $bindable(2) }: { lang: Lang; value?: number } = $props();

	const LEVELS = [0, 1, 2] as const;

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

<div class="help">
	<span class="label smallcaps" id="help-label">{M[lang].levelsAria}</span>
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
	/* The role picker's compact clothes, cut for this control: label and
	   three words on one line, the reader's own in ink, the others quiet.
	   The ghost under each word holds the width of its bold form so the
	   row never shifts as the choice moves (the same device RolePicker
	   documents at length). */
	.help {
		display: inline-flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 0.2rem 0.6rem;
	}

	.label {
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	.options {
		display: inline-flex;
		gap: 0.1rem;
	}

	.option {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.9rem;
		/* the block padding is the touch target (WCAG 2.5.8's 24px), the
		   margin gives the room back to the row — the same trade the role
		   words make */
		padding: 0.3rem 0.15rem;
		margin-block: -0.25rem;
		cursor: pointer;
	}

	.option + .option::before {
		content: '·';
		margin-inline-end: 0.3rem;
		color: var(--ink-soft);
	}

	.slot {
		position: relative;
		display: inline-block;
	}

	.ghost {
		visibility: hidden;
		font-weight: 600;
	}

	.real {
		position: absolute;
		inset-inline-start: 0;
		top: 0;
		width: 100%;
		text-align: center;
	}

	.option.on .real {
		font-weight: 600;
		color: var(--ink);
	}

	.option:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}
</style>

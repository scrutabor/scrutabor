<script lang="ts">
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';

	let { lang, value = $bindable(2) }: { lang: Lang; value?: number } = $props();

	onMount(() => {
		const raw = localStorage.getItem('scrutabor-help');
		if (raw === null) return;
		const stored = Number(raw);
		if (Number.isInteger(stored)) value = Math.max(0, Math.min(stored, 2));
	});

	function persist() {
		localStorage.setItem('scrutabor-help', String(value));
	}
</script>

<div class="help">
	<span class="end smallcaps">{M[lang].levels[0]}</span>
	<input
		type="range"
		min="0"
		max="2"
		step="1"
		bind:value
		oninput={persist}
		aria-label={M[lang].levelsAria}
		aria-valuetext={M[lang].levels[value]}
	/>
	<span class="end smallcaps">{M[lang].levels[2]}</span>
</div>

<style>
	/* The two labels are different lengths — "Latin only" against "full
	   translation", "sama łacina" against "pełny przekład" — so sizing them
	   to their text puts the track wherever the longer one pushes it, and
	   the middle stop of the slider lands off the page's centre line. They
	   share the width equally instead and face inward, which puts the track
	   in the middle of the control and its middle stop under the middle of
	   the title. */
	.help {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: min(100%, 30rem);
		margin-inline: auto;
	}

	.end {
		flex: 1 1 0;
		min-width: 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.end:first-child {
		text-align: end;
	}

	.end:last-child {
		text-align: start;
	}

	input {
		appearance: none;
		-webkit-appearance: none;
		flex: none;
		/* The track is a control, not text. It grows with the reading size
		   like everything else, but it may not take so much of a narrow
		   column that the two labels have nowhere to go — at the largest
		   size on a 320px phone, 9.5rem is 213px of a 253px column and the
		   row pushed the page sideways. */
		width: min(9.5rem, 38%);
		height: 2px;
		background: var(--border);
		border-radius: 1px;
		cursor: pointer;
	}

	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 0.95rem;
		height: 0.95rem;
		border-radius: 50%;
		background: var(--rubric);
		border: none;
		margin-top: 0;
	}

	input::-moz-range-thumb {
		width: 0.95rem;
		height: 0.95rem;
		border-radius: 50%;
		background: var(--rubric);
		border: none;
	}

	input::-moz-range-track {
		height: 2px;
		background: var(--border);
		border-radius: 1px;
	}

	input:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 6px;
	}

	/* Where the three of them will not share a line — the largest reading
	   size on the narrowest phone — the labels take the ends of one row and
	   the track spans beneath them. Breaking "translation" across lines to
	   keep it inline was the first attempt and it looked broken. The
	   threshold is in rem, so it grows with the text: what matters is
	   whether the words fit, not how many device pixels there are. */
	@container (max-width: 18rem) {
		.help {
			flex-wrap: wrap;
			/* The row gap has to clear the THUMB, not the track: the track is
			   2px tall and the thumb 0.95rem, so it overhangs by about half
			   of that either side and was touching the labels above it. */
			gap: 0.75rem 0.7rem;
		}

		.end:first-child {
			text-align: start;
		}

		.end:last-child {
			text-align: end;
		}

		input {
			order: 3;
			flex: 1 1 100%;
			width: 100%;
		}
	}

	@media print {
		.help {
			display: none;
		}
	}
</style>

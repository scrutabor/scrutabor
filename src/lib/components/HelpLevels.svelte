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
	.help {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.end {
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	input {
		appearance: none;
		-webkit-appearance: none;
		width: 9.5rem;
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
</style>

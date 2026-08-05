<script lang="ts">
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { setWake, wake, wakeSupported } from '$lib/wakelock.svelte';

	let { lang }: { lang: Lang } = $props();

	// Resolved in onMount: navigator does not exist at prerender, and the
	// button simply never renders where the API is missing.
	let supported = $state(false);
	onMount(() => {
		supported = wakeSupported();
	});
</script>

{#if supported}
	<button
		class="wake"
		class:on={wake.on}
		aria-pressed={wake.on}
		aria-label={wake.on ? M[lang].wakeAria.toOff : M[lang].wakeAria.toOn}
		title={wake.on ? M[lang].wakeAria.toOff : M[lang].wakeAria.toOn}
		onclick={() => setWake(!wake.on)}
	>
		{#if wake.on}
			<!-- open eye: the screen stays awake -->
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z" />
				<circle cx="12" cy="12" r="2.6" />
			</svg>
		{:else}
			<!-- closed eye: the screen may sleep -->
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M3 12s4 5.5 9 5.5 9-5.5 9-5.5" />
				<path d="M5.2 16.2 3.8 18M12 17.5V20M18.8 16.2l1.4 1.8" />
			</svg>
		{/if}
	</button>
{/if}

<style>
	button {
		width: 2rem;
		height: 2rem;
		display: grid;
		place-items: center;
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0;
		color: var(--ink-soft);
		cursor: pointer;
	}

	button:hover {
		background: var(--wash);
		color: var(--ink);
	}

	button.on {
		color: var(--rubric);
		border-color: var(--rubric);
	}

	svg {
		width: 1.05rem;
		height: 1.05rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>

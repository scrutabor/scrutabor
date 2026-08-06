<script lang="ts">
	// The pill-and-popup the nav settings use: a trigger that says what the
	// setting is on, and a list of what it could be on instead. Two settings
	// want it — the language and the reading size — and they wanted the
	// same seventy lines of chrome and the same dismissal, so it is here
	// once. (The duplication gate would have said so anyway.)
	import type { Snippet } from 'svelte';

	let {
		label,
		trigger,
		children
	}: {
		/** names the button AND the list, for a reader who cannot see it */
		label: string;
		/** what shows on the pill: the current setting, at a glance */
		trigger: Snippet;
		/** the rows; handed `close` so that choosing one dismisses the list */
		children: Snippet<[() => void]>;
	} = $props();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();

	function onWindowClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div class="menu" bind:this={root}>
	<button
		aria-label={label}
		aria-haspopup="listbox"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{@render trigger()}
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
	</button>
	{#if open}
		<ul role="listbox" aria-label={label}>
			{@render children(() => (open = false))}
		</ul>
	{/if}
</div>

<style>
	.menu {
		position: relative;
	}

	button {
		height: 2rem;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		/* more room before the mark: the chevron side reads airier, so the
		   inline padding is deliberately asymmetric */
		padding: 0.3rem 0.55rem 0.3rem 0.75rem;
		color: var(--ink-soft);
		cursor: pointer;
	}

	button:hover {
		background: var(--wash);
		color: var(--ink);
	}

	button svg {
		width: 0.8rem;
		height: 0.8rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	ul {
		position: absolute;
		right: 0;
		top: calc(100% + 0.35rem);
		margin: 0;
		padding: 0.3rem;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
		z-index: 20;
		min-width: 9rem;
	}
</style>

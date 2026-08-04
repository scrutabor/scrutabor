<script lang="ts">
	import Flag from './Flag.svelte';
	import { LANGS, M, type Lang } from '$lib/i18n';

	let { lang }: { lang: Lang } = $props();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();

	// Same page in the other language: swap the leading path segment and
	// keep the query (an open word panel travels as ?w=). Reads location,
	// not page.url — shallow replaceState updates only the former — and is
	// safe because this only runs after a click, never at prerender.
	function pathFor(l: Lang): string {
		return `/${l}${location.pathname.replace(/^\/(pl|en)/, '')}${location.search}`;
	}

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
		aria-label={M[lang].langMenuAria}
		aria-haspopup="listbox"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<Flag {lang} />
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
	</button>
	{#if open}
		<ul role="listbox" aria-label={M[lang].langMenuAria}>
			{#each LANGS as l (l)}
				<li>
					<a
						href={pathFor(l)}
						aria-current={l === lang ? 'true' : undefined}
						lang={l}
						onclick={() => (open = false)}
					>
						<Flag lang={l} />
						<span>{M[l].langName}</span>
					</a>
				</li>
			{/each}
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
		/* more room before the flag: the chevron side reads airier, so the
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
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
		z-index: 20;
		min-width: 9rem;
	}

	li a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.6rem;
		border-radius: 0.35rem;
		text-decoration: none;
		font-size: 0.95rem;
		color: var(--ink);
	}

	li a:hover {
		background: var(--wash);
	}

	li a[aria-current='true'] {
		background: var(--wash-strong);
	}
</style>

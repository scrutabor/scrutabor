<script lang="ts">
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { writeStored } from '$lib/storage';

	let { lang }: { lang: Lang } = $props();

	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.dataset.theme === 'dark';
	});

	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		// keep the installed app's status bar with the page (app.html sets
		// this before first paint; here it follows the reader's choice)
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', dark ? '#1a1611' : '#f7f1e6');
		writeStored('scrutabor-theme', theme);
	}
</script>

<button onclick={toggle} aria-label={dark ? M[lang].themeAria.toLight : M[lang].themeAria.toDark}>
	{#if dark}
		<!-- sun -->
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"
			/>
		</svg>
	{:else}
		<!-- moon -->
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
		</svg>
	{/if}
</button>

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

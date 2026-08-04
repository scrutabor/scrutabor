<script lang="ts">
	import type { Lang } from '$lib/i18n';

	let { lang }: { lang: Lang } = $props();

	// clipPath ids must be unique per instance — the flag renders more than
	// once on a page (menu button + dropdown rows).
	const uid = $props.id();
</script>

<!-- Inline SVG, not emoji: Windows browsers render flag emoji as letters. -->
{#if lang === 'pl'}
	<svg viewBox="0 0 60 40" aria-hidden="true">
		<rect width="60" height="40" fill="#f5f5f5" />
		<rect y="20" width="60" height="20" fill="#dc143c" />
	</svg>
{:else}
	<svg viewBox="0 0 60 40" aria-hidden="true">
		<clipPath id="quad-{uid}">
			<path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
		</clipPath>
		<rect width="60" height="40" fill="#012169" />
		<path d="M0,0 60,40 M60,0 0,40" stroke="#fff" stroke-width="7" />
		<path
			d="M0,0 60,40 M60,0 0,40"
			clip-path="url(#quad-{uid})"
			stroke="#c8102e"
			stroke-width="4.5"
		/>
		<path d="M30,0 v40 M0,20 h60" stroke="#fff" stroke-width="12" />
		<path d="M30,0 v40 M0,20 h60" stroke="#c8102e" stroke-width="7" />
	</svg>
{/if}

<style>
	svg {
		width: 1.45em;
		height: auto;
		display: block;
		border-radius: 2px;
		outline: 1px solid var(--border);
	}
</style>

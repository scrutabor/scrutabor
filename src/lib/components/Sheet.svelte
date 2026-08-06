<script lang="ts">
	// The one bottom sheet. Three things open from a reading page — a
	// word's analysis, the introduction to the prayer, the key to the marks
	// — and a reader is not meant to be able to tell that they are three
	// components. They were, and both halves of the sameness had already
	// drifted: the mark key was on the page background at full width while
	// the other two were cards on a surface, and it closed only by its own
	// ×, because the tap-outside and Escape handling lived in the PAGES
	// that open a sheet, and whoever added the third one did not know to go
	// back and add it there. So the look and the dismissal both live here,
	// once, and a new sheet gets them by construction.
	import type { Snippet } from 'svelte';
	import { M, type Lang } from '$lib/i18n';

	let {
		lang,
		label,
		onclose,
		// The reading page pads its foot by the sheet's height so that a
		// tapped word is never hidden underneath it — hence a knob rather
		// than one constant, and the pairing is why (see .panel-open).
		max = '55vh',
		extra = '',
		title,
		lead,
		children
	}: {
		lang: Lang;
		/** what the sheet is, for a reader who cannot see it */
		label: string;
		onclose: () => void;
		max?: string;
		/** a class for the page to address this sheet by */
		extra?: string;
		/** the small label at the top left, for a sheet that wants one */
		title?: string;
		/** …or the whole left side of the header, for one that does not */
		lead?: Snippet;
		children: Snippet;
	} = $props();

	// Tapping the quiet parts of the page dismisses the sheet; interactive
	// chrome (the language menu, the theme toggle, the help slider, links)
	// does its own job without also closing it, and the sheet's own
	// controls are inside the aside. composedPath, not target.closest: a
	// control that re-renders on click (the theme toggle swaps its icon)
	// detaches the clicked node before the event reaches window.
	function outside(e: MouseEvent) {
		const interactive = e
			.composedPath()
			.some((n) => n instanceof Element && n.matches('a, button, input, select, textarea, aside'));
		if (!interactive) onclose();
	}

	function escape(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onclick={outside} onkeydown={escape} />

<aside class="sheet {extra}" aria-label={label}>
	<div class="inner" style:max-height={max}>
		<header>
			{#if lead}{@render lead()}{:else}<span class="smallcaps title">{title}</span>{/if}
			<button class="close" onclick={onclose} aria-label={M[lang].close}>×</button>
		</header>
		{@render children()}
	</div>
</aside>

<style>
	.sheet {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 10;
		background: var(--surface);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow);
	}

	/* On a wide screen a full-viewport sheet leaves the close button
	   stranded between the text column and the screen edge — so the sheet
	   becomes a centred card and the corner is a real corner. */
	@media (min-width: 48rem) {
		.sheet {
			max-width: 42rem;
			margin-inline: auto;
			border: 1px solid var(--border);
			border-bottom: none;
			border-radius: 0.9rem 0.9rem 0 0;
		}
	}

	.inner {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.1rem 1.5rem calc(1.4rem + env(safe-area-inset-bottom));
		overflow-y: auto;
	}

	header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	.title {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		color: var(--rubric);
	}

	.close {
		appearance: none;
		margin-left: auto;
		/* the tap padding would inset the glyph from the text column's
		   right edge — pull it back onto the corner the eye expects */
		margin-right: -0.5rem;
		border: 0;
		background: none;
		color: var(--ink-soft);
		font: inherit;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}

	.close:hover {
		color: var(--ink);
	}

	.close:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}
</style>

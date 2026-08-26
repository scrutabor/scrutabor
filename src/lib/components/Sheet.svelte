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
		inline = false,
		title,
		lead,
		children
	}: {
		lang: Lang;
		/** what the sheet is, for a reader who cannot see it */
		label: string;
		onclose?: () => void;
		max?: string;
		/** a class for the page to address this sheet by */
		extra?: string;
		/** Keep the same sheet frame in the document flow. Used by the
		 * landing specimen, where the analysis is permanent content rather
		 * than a dismissible overlay. */
		inline?: boolean;
		/** the small label at the top left, for a sheet that wants one */
		title?: string;
		/** …or the whole left side of the header, for one that does not */
		lead?: Snippet;
		children: Snippet;
	} = $props();

	// Tapping the quiet parts of the page dismisses the sheet; interactive
	// chrome (the language menu, the theme toggle, the mode control, links,
	// a source-note disclosure) does its own job without also closing it,
	// and the sheet's own controls are inside the aside. composedPath, not
	// target.closest: a control that re-renders on click (the theme toggle
	// swaps its icon) detaches the clicked node before the event reaches
	// window. `details` covers the whole open disclosure, not only its
	// summary — a reader engaging with the sources is not tapping the
	// quiet page, and opening one used to cost them the panel.
	function outside(e: MouseEvent) {
		if (inline) return;
		const interactive = e
			.composedPath()
			.some(
				(n) =>
					n instanceof Element &&
					n.matches('a, button, input, select, textarea, label, summary, details, aside')
			);
		if (!interactive) onclose?.();
	}

	function escape(e: KeyboardEvent) {
		if (!inline && e.key === 'Escape') onclose?.();
	}

	// A long analysis outgrows the sheet and the sheet scrolls, which is
	// right — but the HEADER was scrolling with it, and the header holds the
	// only way out. On a phone, a word with several senses and an explanation
	// note took the × off the top of the panel entirely (owner, 2026-08-07):
	// a sheet with no visible way to close it, over the prayer it covers.
	//
	// So the header is pinned and only the body moves. The word goes with
	// it, not just the ×: everything below is an answer to "what is this
	// word", and scrolled two screens into Dómine's senses the question
	// itself should still be on the page — the more so here, where the words
	// a reader taps are so often near-identical forms of the same lemma.
	//
	// The rule under it appears only once something has actually gone up
	// behind the header, so a short panel keeps the plain look it has now
	// and a scrolled one says plainly where the fixed part ends.
	let scrolled = $state(false);

	// A dismissible sheet is a non-modal dialog and has to behave like one
	// for a keyboard: focus moves INTO it when it opens — the mark legend's
	// × used to be four hundred tab stops from the mark that opened it —
	// and back to the control that opened it when it closes, so the next
	// Tab continues from where the reader was, not from the top of the
	// Mass. preventScroll, because the panel's own raise() is what manages
	// the page's position. Non-modal on purpose: the prayer stays readable
	// and reachable behind it, so there is no aria-modal and no focus trap.
	let frame = $state<HTMLElement | null>(null);
	$effect(() => {
		if (inline || !frame) return;
		const sheet = frame;
		const invoker = document.activeElement;
		sheet.focus({ preventScroll: true });
		return () => {
			// Only when the reader has not already moved on: closing after
			// browsing other words (focus long since elsewhere) must not
			// yank them back to the first word they tapped.
			const now = document.activeElement;
			const inSheet = now === sheet || sheet.contains(now);
			if (
				(inSheet || now === document.body) &&
				invoker instanceof HTMLElement &&
				invoker.isConnected
			) {
				invoker.focus({ preventScroll: true });
			}
		};
	});
</script>

<svelte:window onclick={outside} onkeydown={escape} />

<!-- The tabindex is -1 — a focus TARGET, never a tab stop — and only on
     the dialog variant; the analyzer cannot see through the ternary. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<aside
	class="sheet {extra}"
	class:inline
	role={inline ? undefined : 'dialog'}
	aria-label={label}
	tabindex={inline ? undefined : -1}
	bind:this={frame}
>
	<div
		class="inner"
		style:max-height={inline ? undefined : max}
		onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
	>
		<header class:scrolled>
			{#if lead}{@render lead()}{:else}<span class="smallcaps title">{title}</span>{/if}
			{#if !inline && onclose}
				<button class="close" onclick={onclose} aria-label={M[lang].close}>×</button>
			{/if}
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

	/* The landing shows the very same sheet as permanent content. Only its
	   placement changes: it participates in the page flow, does not cast an
	   overlay shadow, and never becomes its own scroll region. */
	.sheet.inline {
		position: static;
		inset: auto;
		z-index: auto;
		max-width: 42rem;
		margin: 1.6rem auto 0;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		box-shadow: none;
	}

	.sheet.inline .inner {
		overflow: visible;
	}

	.sheet.inline header {
		position: static;
	}

	/* This box still both scrolls and carries the height the page reserves,
	   so `max` describes the whole sheet exactly as before and
	   main.panel-open goes on padding the reading column by the same
	   figure. It keeps the scrolling because it keeps the close button
	   inside it: a scrollable region with no focusable descendant is
	   unreachable by keyboard, and pulling the header out into a sibling
	   would have created one. The top padding moved into the header, so
	   that nothing shows in the strip above it. */
	.inner {
		max-width: 38rem;
		margin: 0 auto;
		padding: 0 1.5rem calc(1.4rem + env(safe-area-inset-bottom));
		overflow-y: auto;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface);
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 1.1rem 0 0.2rem;
		/* held in place, so the row below cannot shift when it appears */
		border-bottom: 1px solid transparent;
	}

	header.scrolled {
		border-bottom-color: var(--border);
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

	@media print {
		.sheet:not(.inline) {
			display: none;
		}
	}
</style>

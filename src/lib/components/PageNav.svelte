<script lang="ts">
	// The top line of every page of the book: the way back on the left, the
	// settings on the right. Eight routes carried a byte-identical copy
	// of this markup AND of its five CSS rules, which is eight chances for
	// one page's chrome to drift away from the rest — the reader sees all
	// eight, so a difference reads as a fault. It lives here instead.
	import LangMenu from '$lib/components/LangMenu.svelte';
	import TextSize from '$lib/components/TextSize.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { Lang } from '$lib/i18n';

	// A trail, not a title. The corner used to hold ONE link — the way back
	// — and the grammar pages, whose way back is their own index rather than
	// the catalogue, therefore relabelled it: the word in the top left read
	// "gramatyka" instead of "scrutabor", so on those pages the book
	// appeared to have been renamed (owner, 2026-08-07).
	//
	// The name of the book is not a navigation control and does not move. It
	// stays, and a page one level down adds its parent after it —
	// scrutabor › gramatyka — which says both things at once: where you are,
	// and that you can go up. An ordered list because that is what a
	// breadcrumb is; the separator is drawn, not read.
	let { lang, parent, parentLabel }: { lang: Lang; parent?: string; parentLabel?: string } =
		$props();
</script>

<nav>
	<ol class="trail smallcaps">
		<li><a href="/{lang}" class="back">scrutabor</a></li>
		{#if parent && parentLabel}
			<li><span class="sep" aria-hidden="true">›</span><a href={parent}>{parentLabel}</a></li>
		{/if}
	</ol>
	<div class="nav-right">
		<LangMenu {lang} />
		<TextSize {lang} />
		<ThemeToggle {lang} />
	</div>
</nav>

<style>
	/* The settings are touch targets, so they grow with the text size like
	   everything else — and on the smallest phone at the largest size the
	   three of them plus the way back no longer fit on one line. They wrap
	   rather than push the page sideways. (Nothing to do with the size
	   setting in particular: a longer word than "scrutabor" would have
	   done it too.) */
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-right {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	/* The trail wraps like everything else in this row, and a crumb that
	   wraps takes its separator with it. */
	.trail {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.trail a {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.trail a:hover {
		color: var(--ink);
	}

	.sep {
		/* quieter than either crumb: it is punctuation, not a step */
		margin: 0 0.4rem;
		font-size: 0.85rem;
		color: var(--border);
	}
</style>

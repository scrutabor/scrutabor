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
	// parentLang, because a crumb is not always in the interface language:
	// the Ordo's is "Ordo Missæ", which is Latin and has to say so — the
	// Polish sweep reads the nearest [lang] to decide whether a line is
	// governed by Polish typography, and <html lang> would otherwise claim
	// it.
	let {
		lang,
		parent,
		parentLabel,
		parentLang
	}: { lang: Lang; parent?: string; parentLabel?: string; parentLang?: string } = $props();
</script>

<nav>
	<ol class="trail smallcaps">
		<li><a href="/{lang}" class="back">scrutabor</a></li>
		{#if parent && parentLabel}
			<li>
				<span class="sep" aria-hidden="true">›</span><a href={parent} lang={parentLang}
					>{parentLabel}</a
				>
			</li>
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

	/* Every crumb the same height, whatever case it is written in.
	   `font-variant-caps: small-caps` only shrinks LOWERCASE letters;
	   capitals keep their full height. So "scrutabor" came out uniformly
	   small and "Ordo Missæ" came out with two full-height letters
	   standing over small ones, and the second crumb read as though it
	   were set larger (owner, 2026-08-07 — it is not: both compute to
	   13.6px). Lowercased first, so the small-caps rule has only
	   lowercase to work on and the case a label happens to be written in
	   stops being a typographic decision. Same pairing as .who in
	   TextBody, for the same reason.
	   text-transform is paint: the DOM text, and so the accessible name,
	   is still "Ordo Missæ". */
	.trail {
		text-transform: lowercase;
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

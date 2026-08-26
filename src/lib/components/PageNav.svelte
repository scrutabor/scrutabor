<script lang="ts">
	// The top line of every page of the book: the way back on the left, the
	// settings on the right. Eight routes carried a byte-identical copy
	// of this markup AND of its five CSS rules, which is eight chances for
	// one page's chrome to drift away from the rest — the reader sees all
	// eight, so a difference reads as a fault. It lives here instead.
	import LangMenu from '$lib/components/LangMenu.svelte';
	import Search from '$lib/components/Search.svelte';
	import TextSize from '$lib/components/TextSize.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	// A trail, not a title. The corner used to hold ONE link — the way back
	// — and the grammar pages, whose way back is their own index rather than
	// the catalogue, therefore relabelled it: the word in the top left read
	// "gramatyka" instead of "scrutabor", so on those pages the book
	// appeared to have been renamed (owner, 2026-08-07).
	//
	// The public site and the prayer book have distinct homes. A wordmark in
	// the book made that distinction obscure: either its target changed by
	// platform, or it became an unnoticed exit from a contained app. Inside
	// /app a familiar home symbol now ALWAYS means the local catalogue;
	// Scrutabor remains the public-site wordmark only on landing subpages.
	// A local parent can follow the home control — home › gramatyka. An
	// ordered list because that is what a breadcrumb is; the separator is
	// drawn, not read.
	// parentLang, because a crumb is not always in the interface language:
	// the Ordo's is "Ordo Missæ", which is Latin and has to say so — the
	// Polish sweep reads the nearest [lang] to decide whether a line is
	// governed by Polish typography, and <html lang> would otherwise claim
	// it.
	// base: the landing's subpages carry the same trail, but their home is
	// the landing at the origin root and do not add the prayer-book crumb
	// (owner, 2026-08-08: a page without the top-left way back reads as a
	// dead end, even with a link at the foot).
	let {
		lang,
		parent,
		parentLabel,
		parentLang,
		base = '/app'
	}: {
		lang: Lang;
		parent?: string;
		parentLabel?: string;
		parentLang?: string;
		base?: string;
	} = $props();
</script>

<nav>
	<ol class="trail smallcaps">
		{#if base === '/app'}
			<li>
				<a class="home" href="/app/{lang}" aria-label={M[lang].bookHome} title={M[lang].bookHome}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M3.5 10.5 12 3.8l8.5 6.7" />
						<path d="M5.5 9.2v10h13v-10M9.5 19.2v-6h5v6" />
					</svg>
				</a>
			</li>
		{:else}
			<li><a href="/{lang}" class="back">scrutabor</a></li>
		{/if}
		{#if parent && parentLabel}
			<li>
				<span class="sep" aria-hidden="true">›</span><a href={parent} lang={parentLang}
					>{parentLabel}</a
				>
			</li>
		{/if}
	</ol>
	<div class="nav-right">
		{#if base === '/app'}<Search {lang} />{/if}
		<LangMenu {lang} {base} />
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
		margin-inline-start: auto;
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
		align-items: center;
		list-style: none;
		margin: 0;
		padding: 0;
		row-gap: 0.2rem;
	}

	.trail li {
		display: flex;
		align-items: center;
		white-space: nowrap;
	}

	.trail a {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.trail .home {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--border);
		border-radius: 999px;
	}

	.home svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.trail .home:hover {
		background: var(--wash);
	}

	.trail a:hover {
		color: var(--ink);
	}

	.sep {
		/* quieter than either crumb: it is punctuation, not a step */
		display: inline-block;
		margin: 0 0.4rem;
		font-size: 0.85rem;
		line-height: 1;
		color: var(--border);
	}

	@media print {
		nav {
			display: none;
		}
	}
</style>

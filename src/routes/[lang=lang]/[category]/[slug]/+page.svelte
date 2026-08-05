<script lang="ts">
	import { untrack } from 'svelte';
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { TEXTS } from '$lib/corpus';
	import { goto } from '$app/navigation';
	import { neighborsOf, sectionFor } from '$lib/catalog';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
	const entry = $derived(TEXTS[`${page.params.category}/${page.params.slug}`]);
	const doc = $derived(entry?.text);
	const gloss = $derived(entry?.glosses[lang]);
	const sectionLabel = $derived(sectionFor(page.params.category ?? '')?.label[lang] ?? '');
	// Book navigation: the catalog's flattened order — within ordinarium
	// that is the liturgical sequence, so a reader can follow the Mass
	// text to text without returning to the catalog.
	const around = $derived(neighborsOf(page.params.category ?? '', page.params.slug ?? ''));

	// Three verbosity states:
	// 0 = text only · 1 = + interlinear glosses · 2 = + translations (as
	// always-open boxes, no toggles) and rubric narratives
	let helpLevel = $state(1);

	const wordsById = $derived(
		new Map((doc?.segments ?? []).flatMap((s) => (s.words ?? []).map((w) => [w.id, w] as const)))
	);

	let selectedId = $state<string | null>(null);

	// Bottom-sheet history model (one entry per panel session, the Material
	// convention): OPENING the panel pushes a ?w= entry, so back closes it;
	// SWITCHING words replaces, so browsing ten words never costs ten back
	// presses; ×, outside-click, Esc and back all close through the same
	// popped entry. A panel opened by a deep link pushed nothing — back then
	// returns to the page the reader came from, and closing it merely strips
	// ?w= from the current entry.
	let openedByPush = false;

	function urlWith(id: string | null): URL {
		const url = new URL(location.href);
		if (id) url.searchParams.set('w', id);
		else url.searchParams.delete('w');
		return url;
	}

	function openWord(id: string) {
		if (selectedId === null) {
			pushState(urlWith(id), {});
			openedByPush = true;
		} else {
			replaceState(urlWith(id), {});
		}
		selectedId = id;
	}

	// Closing must not move the page: the router restores the scroll
	// position recorded when the panel's history entry was pushed (before
	// any tap-scroll shift), and dropping the sheet padding can clamp a
	// near-end position. Pin the current position across both.
	let keepPanelPad = $state(false);

	function preserveScroll() {
		const y = window.scrollY;
		const pad = window.innerHeight * 0.45;
		const maxAfter = document.documentElement.scrollHeight - pad - window.innerHeight;
		if (y > maxAfter) keepPanelPad = true;
		const pin = () => window.scrollTo({ top: y, behavior: 'auto' });
		setTimeout(pin, 0);
		requestAnimationFrame(() => requestAnimationFrame(pin));
	}

	function closePanel() {
		preserveScroll();
		if (openedByPush) {
			openedByPush = false;
			history.back();
		} else {
			replaceState(urlWith(null), {});
		}
		selectedId = null;
	}

	// Navigations apply the URL's selection and scroll to it. page.url is
	// only the TRIGGER (real navigations change it; shallow push/replace do
	// not, so taps cannot re-run this — the revert-on-tap regression class
	// stays excluded); the value comes from location, because after a
	// history traversal to a shallow-modified entry page.url can lag behind
	// the real URL. The popstate listener covers same-route traversals
	// (back closing / forward reopening the panel), where no navigation
	// fires at all. Effects and window listeners never run at prerender, so
	// reading location here is safe.
	function applyFromLocation() {
		const w = new URL(location.href).searchParams.get('w');
		const target = w && wordsById.has(w) ? w : null;
		// The browser's own back also just closes the panel - the page
		// stays where the reader is, not where they were when it opened.
		// untrack: reading selectedId here plainly would make the
		// navigation effect depend on it, re-running this on every tap
		// (the documented read-after-write regression class).
		if (!target && untrack(() => selectedId) !== null) preserveScroll();
		if (!target) openedByPush = false;
		selectedId = target;
		// The router resets scroll AFTER this runs on client-side
		// navigations — schedule the centering behind it or deep links into
		// long texts land at the top.
		if (target) {
			requestAnimationFrame(() =>
				document.getElementById(target)?.scrollIntoView({ block: 'center' })
			);
		}
	}

	$effect(() => {
		void page.url;
		void wordsById;
		applyFromLocation();
	});

	// Tapping the quiet parts of the page dismisses the sheet; interactive
	// chrome (language menu, theme toggle, the help slider, links) does its
	// own job without also closing it. Word buttons switch, the sheet's own
	// controls are inside the aside. composedPath, not target.closest: a
	// control that re-renders on click (the theme toggle swaps its icon)
	// detaches the clicked node before the event reaches window.
	// The about sheet shares the word panel's idiom (one bottom sheet at
	// a time, same dismissal gestures) but not its history model — it is
	// chrome, one tap to reopen.
	let aboutOpen = $state(false);

	function toggleAbout() {
		if (!aboutOpen && selectedId !== null) closePanel();
		aboutOpen = !aboutOpen;
	}

	function onWindowClick(e: MouseEvent) {
		if (selectedId === null && !aboutOpen) return;
		const interactive = e
			.composedPath()
			.some((n) => n instanceof Element && n.matches('a, button, input, select, textarea, aside'));
		if (!interactive) {
			if (selectedId !== null) closePanel();
			aboutOpen = false;
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (selectedId !== null) closePanel();
			aboutOpen = false;
			return;
		}
		// Arrow keys page through the book — unless a control (the help
		// slider) owns them.
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		const tag = (document.activeElement as HTMLElement | null)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		const target = e.key === 'ArrowLeft' ? around.prev : around.next;
		if (target) goto(`/${lang}/${target.category}/${target.slug}`);
	}

	let selectedWord = $derived(selectedId ? (wordsById.get(selectedId) ?? null) : null);
	let selectedGloss = $derived(selectedId && gloss ? (gloss.words[selectedId] ?? null) : null);
	let selectedAnalysis = $derived(
		selectedWord && doc
			? (selectedWord.analysis ?? doc.analysis_defaults_words ?? doc.analysis_defaults)
			: null
	);

	// A tap must never bury the analyzed word under its own panel: once
	// the sheet has rendered, scroll by exactly the overlap (plus a
	// breathing margin), so words already visible stay put. panel-open
	// pads the page bottom, so even the last word has room to rise.
	function ensureWordAboveSheet(id: string) {
		requestAnimationFrame(() => {
			const el = document.getElementById(id);
			const sheet = document.querySelector('aside');
			if (!el || !sheet) return;
			const margin = 16;
			const overlap =
				el.getBoundingClientRect().bottom + margin - sheet.getBoundingClientRect().top;
			if (overlap <= 0) return;
			const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollBy({ top: overlap, behavior: reduced ? 'auto' : 'smooth' });
		});
	}

	function toggle(id: string) {
		aboutOpen = false;
		if (selectedId === id) closePanel();
		else {
			openWord(id);
			ensureWordAboveSheet(id);
		}
	}

	function navigateTo(id: string) {
		openWord(id);
		document.getElementById(id)?.scrollIntoView({ block: 'center' });
		ensureWordAboveSheet(id);
	}
</script>

<svelte:window onpopstate={applyFromLocation} onclick={onWindowClick} onkeydown={onWindowKeydown} />

<svelte:head>
	<title>{doc ? `${doc.title} — Scrutabor` : 'Scrutabor'}</title>
	{#if doc}
		<meta name="description" content={msgs.readingDescription.replace('{title}', doc.title)} />
	{/if}
</svelte:head>

{#if !entry || !doc || !gloss}
	<div class="page">
		<p><a href="/{lang}">Scrutabor</a></p>
	</div>
{:else}
	<div class="page">
		<header>
			<nav>
				<a href="/{lang}" class="back smallcaps">scrutabor</a>
				<div class="nav-right">
					<LangMenu {lang} />
					<ThemeToggle {lang} />
				</div>
			</nav>
			<h1 lang="la">{doc.title}</h1>
			<p class="subtitle smallcaps">{sectionLabel}</p>
			<div class="help-row">
				<HelpLevels {lang} bind:value={helpLevel} />
			</div>
			{#if gloss.about}
				<!-- Closed at EVERY slider position (owner rule): the
				     introduction is one tap away, never ambient. It opens as
				     a bottom sheet — the reading layout never reflows. -->
				<button class="about-pill smallcaps" aria-expanded={aboutOpen} onclick={toggleAbout}
					>{msgs.aboutLabel}</button
				>
			{/if}
		</header>

		<main class:panel-open={selectedWord !== null || keepPanelPad}>
			{#each doc.segments as seg (seg.id)}
				{#if seg.type === 'rubric'}
					<div class="rubric">
						<p class="rubric-la" lang="la">{seg.text}</p>
						<!-- Narratives ride with any help (reading-ux §5): knowing what
						     happens at the altar is word-level-grade help; translations
						     alone stay at the top step. -->
						{#if helpLevel >= 1 && gloss.segments[seg.id]?.narrative}
							<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
						{/if}
					</div>
				{:else}
					<p class="verse" class:glossed={helpLevel >= 1} lang="la">
						<!-- Word and its trailing punctuation form one atomic token
						     (inline-block): the line breaker may only break at the
						     spaces BETWEEN tokens, never between a word and its
						     comma or period. Guarded by the one-rect e2e invariant. -->
						{#each seg.words ?? [] as w (w.id)}<span class="token"
								><button
									class="word"
									id={w.id}
									class:selected={selectedId === w.id}
									onclick={() => toggle(w.id)}
									><ruby
										>{w.form}{#if helpLevel >= 1}<rt {lang}>{gloss.words[w.id]?.gloss}</rt
											>{/if}</ruby
									></button
								>{w.post ?? ''}</span
							>{' '}{/each}
					</p>
					{#if helpLevel >= 2 && gloss.segments[seg.id]?.translation}
						<div class="seg-extra">
							<p class="translation">{gloss.segments[seg.id].translation}</p>
						</div>
					{/if}
				{/if}
			{/each}

			<nav class="pager" aria-label={msgs.pagerAria}>
				{#if around.prev}
					<a class="pager-link" href="/{lang}/{around.prev.category}/{around.prev.slug}"
						><span class="chev" aria-hidden="true">‹</span>
						<span lang="la">{around.prev.title}</span></a
					>
				{:else}
					<span></span>
				{/if}
				{#if around.next}
					<a class="pager-link pager-next" href="/{lang}/{around.next.category}/{around.next.slug}"
						><span lang="la">{around.next.title}</span>
						<span class="chev" aria-hidden="true">›</span></a
					>
				{/if}
			</nav>
		</main>

		{#if aboutOpen && gloss.about}
			<aside class="about-sheet" aria-label={msgs.aboutLabel}>
				<div class="about-inner">
					<header class="about-header">
						<span class="smallcaps about-title">{msgs.aboutLabel}</span>
						<button class="about-close" onclick={() => (aboutOpen = false)} aria-label={msgs.close}
							>×</button
						>
					</header>
					<p class="about-text">{gloss.about}</p>
				</div>
			</aside>
		{/if}

		{#if selectedWord && selectedAnalysis}
			<WordPanel
				word={selectedWord}
				gloss={selectedGloss}
				analysis={selectedAnalysis}
				{lang}
				onclose={closePanel}
				onnavigate={navigateTo}
			/>
		{/if}
	</div>
{/if}

<style>
	.page {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	h1 {
		margin: 1.8rem 0 0;
		font-size: 2.6rem;
		font-weight: 500;
		text-align: center;
	}

	.subtitle {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.help-row {
		display: flex;
		justify-content: center;
		margin: 1.4rem 0 2.2rem;
	}

	main.panel-open {
		padding-bottom: 45vh;
	}

	.verse {
		font-size: 1.45rem;
		line-height: 1.75;
		margin: 0 0 1.1rem;
	}

	.verse.glossed {
		line-height: 2.7;
	}

	/* The about pill opens a bottom sheet (the word panel's idiom), so
	   the reading layout never reflows. */
	.about-pill {
		margin: 1.6rem auto 1.4rem;
		display: block;
		width: fit-content;
		font: inherit;
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--ink-soft);
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.25rem 0.9rem;
	}

	.about-pill:hover {
		color: var(--ink);
		background: var(--wash);
	}

	.about-sheet {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		background: var(--surface);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow);
		z-index: 10;
	}

	/* On wide screens the full-viewport sheet leaves the close button
	   stranded between the content column and the screen edge — so the
	   sheet becomes a centered card and the corner is a real corner. */
	@media (min-width: 48rem) {
		.about-sheet {
			max-width: 42rem;
			margin-inline: auto;
			border: 1px solid var(--border);
			border-bottom: none;
			border-radius: 0.9rem 0.9rem 0 0;
		}
	}

	.about-inner {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.1rem 1.5rem calc(1.4rem + env(safe-area-inset-bottom));
		max-height: 55vh;
		overflow-y: auto;
	}

	.about-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	.about-title {
		font-size: 0.75rem;
		color: var(--rubric);
	}

	.about-close {
		margin-left: auto;
		/* the button's tap padding would inset the glyph from the text
		   column's right edge — pull it back out so the × sits ON the
		   corner the eye expects */
		margin-right: -0.5rem;
		font: inherit;
		font-size: 1.3rem;
		line-height: 1;
		background: none;
		border: none;
		color: var(--ink-soft);
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}

	.about-close:hover {
		color: var(--ink);
	}

	.about-text {
		margin: 0.6rem 0 0;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--ink);
	}

	.pager {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--border);
	}

	.pager-link {
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 1.05rem;
	}

	.pager-link:hover {
		color: var(--ink);
	}

	.pager-next {
		text-align: right;
		margin-left: auto;
	}

	/* EB Garamond centers its guillemets on the x-height, which reads
	   low beside capital-initial titles — raise them optically. */
	.chev {
		display: inline-block;
		transform: translateY(-0.09em);
		margin-inline: 0.15em;
	}

	.token {
		display: inline-block;
	}

	.word {
		font: inherit;
		background: none;
		border: none;
		padding: 0 0.1rem;
		margin: 0;
		border-radius: 0.25rem;
		cursor: pointer;
		color: inherit;
	}

	.word:hover {
		background: var(--wash);
	}

	.word.selected {
		background: var(--wash-strong);
	}

	.word:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}

	ruby {
		ruby-position: under;
	}

	rt {
		font-size: 0.55em;
		font-style: italic;
		color: var(--ink-soft);
		letter-spacing: 0.01em;
	}

	.rubric {
		margin: 0 0 1.1rem;
		border-inline-start: 2px solid var(--rubric);
		padding-inline-start: 0.9rem;
	}

	.rubric-la {
		margin: 0;
		color: var(--rubric);
		font-style: italic;
		font-size: 1.05rem;
	}

	.rubric-narrative {
		margin: 0.25rem 0 0;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.5;
	}

	/* Translations get the same typographic treatment as rubric narratives —
	   a thin vertical hairline with an indent — so the page stays layered
	   text, not cards: red hairline = what happens, neutral = what it means. */
	.seg-extra {
		margin: -0.45rem 0 1.4rem;
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: 0.9rem;
	}

	.translation {
		margin: 0;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1.55;
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import { TEXTS } from '$lib/corpus';
	import { goto } from '$app/navigation';
	import { neighborsOf, sectionFor } from '$lib/catalog';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ribbon } from '$lib/ribbon.svelte';
	import { wordPanel } from '$lib/wordpanel.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';

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

	// The panel behaves the same here as in the flow — see lib/wordpanel.
	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	$effect(() => {
		void page.url;
		void wordsById;
		panel.applyFromLocation();
	});

	// Reading is the whole point of this page: hold the screen open.
	keepAwake();

	// The book's ribbon, keyed by text (see lib/ribbon): a deep link into a
	// word outranks it — that reader asked for a place.
	ribbon(
		() => `scrutabor-pos:${page.params.category}/${page.params.slug}`,
		() => new URL(location.href).searchParams.has('w')
	);

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

	function tapWord(id: string) {
		aboutOpen = false;
		panel.toggle(id);
	}

	function toggleAbout() {
		if (!aboutOpen && panel.id !== null) panel.close();
		aboutOpen = !aboutOpen;
	}

	function onWindowClick(e: MouseEvent) {
		if (panel.id === null && !aboutOpen) return;
		const interactive = e
			.composedPath()
			.some((n) => n instanceof Element && n.matches('a, button, input, select, textarea, aside'));
		if (!interactive) {
			if (panel.id !== null) panel.close();
			aboutOpen = false;
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (panel.id !== null) panel.close();
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

	let selectedWord = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	let selectedGloss = $derived(panel.id && gloss ? (gloss.words[panel.id] ?? null) : null);
	let selectedAnalysis = $derived(
		selectedWord && doc
			? (selectedWord.analysis ?? doc.analysis_defaults_words ?? doc.analysis_defaults)
			: null
	);
</script>

<svelte:window
	onpopstate={panel.applyFromLocation}
	onclick={onWindowClick}
	onkeydown={onWindowKeydown}
/>

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

		<main class:panel-open={selectedWord !== null || panel.keepPad}>
			<TextBody {doc} {gloss} {lang} {helpLevel} selectedId={panel.id} ontap={tapWord} />

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
				onclose={panel.close}
				onnavigate={panel.goTo}
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
</style>

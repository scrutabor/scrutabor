<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { neighborsOf, sectionFor } from '$lib/catalog';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ribbon } from '$lib/ribbon.svelte';
	import { wordPanel } from '$lib/wordpanel.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';

	// The corpus arrives from the server load, already narrowed to this text
	// — the browser never receives the whole snapshot (see +page.server.ts).
	let { data } = $props();

	const lang = $derived(page.params.lang as Lang);

	const msgs = $derived(M[lang]);
	const doc = $derived(data.doc);

	// A page whose text is spoken by one voice throughout has nothing for
	// the reader's part to change: no line is marked as theirs and nothing
	// folds. Offering the choice there is offering a control that does
	// nothing, so it is not offered — Quod ore súmpsimus is the priest's
	// alone from beginning to end.
	const takesPart = $derived(
		new Set(doc.segments.filter((sg) => sg.type === 'verse' && sg.speaker).map((sg) => sg.speaker))
			.size > 1
	);
	const gloss = $derived(data.gloss);
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

	// Three sheets can open from this page and only one at a time: opening
	// any of them closes the others. That is the page's business; how a
	// sheet looks and how it is dismissed is the Sheet component's. The
	// introduction and the mark key are chrome — one tap to reopen — so
	// unlike the word panel they keep no history.
	let aboutOpen = $state(false);
	let legendOpen = $state(false);

	function openLegend() {
		panel.close();
		aboutOpen = false;
		legendOpen = true;
	}

	function tapWord(id: string) {
		aboutOpen = false;
		legendOpen = false;
		panel.toggle(id);
	}

	function toggleAbout() {
		legendOpen = false;
		if (!aboutOpen && panel.id !== null) panel.close();
		aboutOpen = !aboutOpen;
	}

	function onWindowKeydown(e: KeyboardEvent) {
		// Arrow keys page through the book — unless a control (the help
		// slider) owns them. (Escape belongs to whichever sheet is open,
		// and it handles it itself.)
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

<svelte:window onpopstate={panel.applyFromLocation} onkeydown={onWindowKeydown} />

<svelte:head>
	<title>{doc ? `${doc.title} — Scrutabor` : 'Scrutabor'}</title>
	{#if doc}
		<meta name="description" content={msgs.readingDescription.replace('{title}', doc.title)} />
	{/if}
</svelte:head>

{#if !doc || !gloss}
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
				{#if takesPart}<RolePicker {lang} compact />{/if}
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
			<TextBody
				{doc}
				{gloss}
				{lang}
				{helpLevel}
				selectedId={panel.id}
				ontap={tapWord}
				onmark={openLegend}
			/>

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
			<Sheet
				{lang}
				label={msgs.aboutLabel}
				title={msgs.aboutLabel}
				extra="about-sheet"
				onclose={() => (aboutOpen = false)}
			>
				<p class="about-text">{gloss.about}</p>
			</Sheet>
		{/if}

		{#if legendOpen}
			<MarkLegend {lang} onclose={() => (legendOpen = false)} />
		{/if}

		{#if selectedWord && selectedAnalysis}
			<WordPanel
				word={selectedWord}
				gloss={selectedGloss}
				analysis={selectedAnalysis}
				lex={data.lex}
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

	/* The page's own top section only. Unqualified, this reached the
	   about sheet's header too and opened a 3rem hole under its label. */
	.page > header {
		padding-bottom: 3rem;
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
		flex-direction: column;
		align-items: center;
		gap: 1.3rem;
		margin: 1.6rem 0 0;
	}

	main.panel-open {
		padding-bottom: 45vh;
	}

	/* The about pill opens the shared bottom sheet, so the reading layout
	   never reflows for it. */
	.about-pill {
		margin: 1.4rem auto 0;
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

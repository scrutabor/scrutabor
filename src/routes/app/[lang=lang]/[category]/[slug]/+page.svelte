<script lang="ts">
	import { goto } from '$app/navigation';
	import { neighborsOf, sectionFor } from '$lib/catalog';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ribbon } from '$lib/ribbon.svelte';
	import { wordPanel } from '$lib/wordpanel.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';

	// The corpus arrives from the server load, already narrowed to this text
	// — the browser never receives the whole snapshot (see +page.server.ts).
	let { data } = $props();

	const lang = $derived(data.lang as Lang);

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
	const sectionLabel = $derived(sectionFor(data.category)?.label[lang] ?? '');
	// Book navigation: the catalog's flattened order — within ordinarium
	// that is the liturgical sequence, so a reader can follow the Mass
	// text to text without returning to the catalog.
	const around = $derived(neighborsOf(data.category, data.slug));

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
		void wordsById;
		panel.applyFromLocation();
	});

	// Reading is the whole point of this page: hold the screen open.
	keepAwake();

	// The book's ribbon, keyed by text (see lib/ribbon): a deep link into a
	// word outranks it — that reader asked for a place.
	ribbon(
		() => `scrutabor-pos:${data.category}/${data.slug}`,
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
		// A BARE arrow key, and only that. Cmd+← is Back on a Mac and Alt+←
		// is Back everywhere else, and this was swallowing both: the reader
		// pressed Back and went to the next prayer instead (owner,
		// 2026-08-07). Every modifier is refused rather than the two that
		// are known to mean something, because a shortcut this page has
		// never heard of still belongs to the browser and not to it.
		if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
		const tag = (document.activeElement as HTMLElement | null)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		const target = e.key === 'ArrowLeft' ? around.prev : around.next;
		if (target) goto(`/app/${lang}/${target.category}/${target.slug}`);
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
	<div class="page reading">
		<p><a href="/app/{lang}">Scrutabor</a></p>
	</div>
{:else}
	<div class="page reading">
		<header>
			<PageNav {lang} />
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

			<Pager
				{lang}
				prev={around.prev && {
					href: `/app/${lang}/${around.prev.category}/${around.prev.slug}`,
					title: around.prev.title
				}}
				next={around.next && {
					href: `/app/${lang}/${around.next.category}/${around.next.slug}`,
					title: around.next.title
				}}
			/>
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
	/* The page's own top section only. Unqualified, this reached the
	   about sheet's header too and opened a 3rem hole under its label. */
	.page > header {
		padding-bottom: 3rem;
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
</style>

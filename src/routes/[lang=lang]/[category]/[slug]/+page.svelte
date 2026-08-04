<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { TEXTS } from '$lib/corpus';
	import { sectionFor } from '$lib/catalog';
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

	function closePanel() {
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
	function onWindowClick(e: MouseEvent) {
		if (selectedId === null) return;
		const interactive = e
			.composedPath()
			.some((n) => n instanceof Element && n.matches('a, button, input, select, textarea, aside'));
		if (!interactive) closePanel();
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && selectedId !== null) closePanel();
	}

	let selectedWord = $derived(selectedId ? (wordsById.get(selectedId) ?? null) : null);
	let selectedGloss = $derived(selectedId && gloss ? (gloss.words[selectedId] ?? null) : null);
	let selectedAnalysis = $derived(
		selectedWord && doc ? (selectedWord.analysis ?? doc.analysis_defaults) : null
	);

	function toggle(id: string) {
		if (selectedId === id) closePanel();
		else openWord(id);
	}

	function navigateTo(id: string) {
		openWord(id);
		document.getElementById(id)?.scrollIntoView({ block: 'center' });
	}
</script>

<svelte:window onpopstate={applyFromLocation} onclick={onWindowClick} onkeydown={onWindowKeydown} />

<svelte:head>
	<title>{doc ? `${doc.title} — Scrutabor` : 'Scrutabor'}</title>
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
			<p class="subtitle smallcaps">{sectionLabel} · {msgs.workingEdition}</p>
			<div class="help-row">
				<HelpLevels {lang} bind:value={helpLevel} />
			</div>
		</header>

		<main class:panel-open={selectedWord !== null}>
			{#each doc.segments as seg (seg.id)}
				{#if seg.type === 'rubric'}
					<div class="rubric">
						<p class="rubric-la" lang="la">{seg.text}</p>
						{#if helpLevel >= 2 && gloss.segments[seg.id]?.narrative}
							<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
						{/if}
					</div>
				{:else}
					<p class="verse" class:glossed={helpLevel >= 1} lang="la">
						{#each seg.words ?? [] as w (w.id)}<button
								class="word"
								id={w.id}
								class:selected={selectedId === w.id}
								onclick={() => toggle(w.id)}
								><ruby
									>{w.form}{#if helpLevel >= 1}<rt {lang}>{gloss.words[w.id]?.gloss}</rt>{/if}</ruby
								></button
							>{w.post ?? ''}{' '}{/each}
					</p>
					{#if helpLevel >= 2 && gloss.segments[seg.id]?.translation}
						<div class="seg-extra">
							<p class="translation">{gloss.segments[seg.id].translation}</p>
						</div>
					{/if}
				{/if}
			{/each}
		</main>

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

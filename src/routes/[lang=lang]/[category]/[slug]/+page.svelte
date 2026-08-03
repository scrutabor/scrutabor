<script lang="ts">
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
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
	// 0 = text only · 1 = + rubric narratives and translations · 2 = + glosses
	let helpLevel = $state(2);
	let selectedId = $state<string | null>(null);
	const openTranslations = new SvelteSet<string>();

	const wordsById = $derived(
		new Map((doc?.segments ?? []).flatMap((s) => (s.words ?? []).map((w) => [w.id, w] as const)))
	);

	// Segment ids and word ids restart per text — reset transient state when
	// navigating between texts within the same route component.
	$effect(() => {
		void doc;
		selectedId = null;
		openTranslations.clear();
	});

	const translationIds = $derived(
		(doc?.segments ?? [])
			.filter((s) => gloss?.segments[s.id]?.translation)
			.map((s) => s.id)
	);

	// The top level means "everything": all translations unfold; individual
	// boxes can still be closed by hand. Dropping below re-collapses them.
	$effect(() => {
		if (helpLevel >= 2) {
			for (const id of translationIds) openTranslations.add(id);
		} else {
			openTranslations.clear();
		}
	});

	let selectedWord = $derived(selectedId ? (wordsById.get(selectedId) ?? null) : null);
	let selectedGloss = $derived(
		selectedId && gloss ? (gloss.words[selectedId] ?? null) : null
	);
	let selectedAnalysis = $derived(
		selectedWord && doc ? (selectedWord.analysis ?? doc.analysis_defaults) : null
	);

	function toggle(id: string) {
		selectedId = selectedId === id ? null : id;
	}

	function navigateTo(id: string) {
		selectedId = id;
		document.getElementById(id)?.scrollIntoView({ block: 'center' });
	}

	function toggleTranslation(id: string) {
		if (openTranslations.has(id)) openTranslations.delete(id);
		else openTranslations.add(id);
	}
</script>

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
						{#if helpLevel >= 1 && gloss.segments[seg.id]?.narrative}
							<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
						{/if}
					</div>
				{:else}
					<p class="verse" class:glossed={helpLevel >= 2} lang="la">
						{#each seg.words ?? [] as w (w.id)}<button
								class="word"
								id={w.id}
								class:selected={selectedId === w.id}
								onclick={() => toggle(w.id)}
								><ruby>{w.form}{#if helpLevel >= 2}<rt lang={lang}
											>{gloss.words[w.id]?.gloss}</rt
										>{/if}</ruby></button
							>{w.post ?? ''}{' '}{/each}
					</p>
					{#if helpLevel >= 1 && gloss.segments[seg.id]?.translation}
						<div class="seg-extra" class:box={openTranslations.has(seg.id)}>
							<button
								class="reveal smallcaps trim-label"
								class:open={openTranslations.has(seg.id)}
								aria-expanded={openTranslations.has(seg.id)}
								onclick={() => toggleTranslation(seg.id)}
							>
								{msgs.translationLabel}<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"
									><path d="m6 9 6 6 6-6" /></svg
								>
							</button>
							{#if openTranslations.has(seg.id)}
								<p class="translation">{gloss.segments[seg.id].translation}</p>
							{/if}
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
				onclose={() => (selectedId = null)}
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

	.seg-extra {
		margin: -0.6rem 0 1.3rem;
	}

	/* When open, a box grows around the button and translation: the pill
	   keeps its x-position (the box extends into the gutter via negative
	   inline margins) and reads as the box's header tab. */
	.seg-extra.box {
		margin-inline: -1rem;
		padding: 0.5rem 1rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		background: var(--surface);
	}

	/* Label uses the metrics-normalized face (.trim-label in app.css), so
	   line-box centering IS optical centering, in every browser. The
	   chevron rides the TEXT baseline via vertical-align — text and icon
	   cannot drift apart: -0.24em puts the chevron's ink midpoint at
	   small-cap mid-height (0.25em - half of the 0.7rem icon). Right
	   padding is tighter: the chevron is airy and over-reads as space. */
	.reveal {
		display: inline-block;
		font-variant-caps: small-caps;
		letter-spacing: 0.08em;
		font-size: 0.72rem;
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.22rem 0.7rem 0.22rem 0.9rem;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.reveal:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.reveal.open {
		background: var(--wash-strong);
		border-color: var(--wash-strong);
		color: var(--ink);
	}

	.reveal .chev {
		width: 0.7rem;
		height: 0.7rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform 0.15s ease;
		vertical-align: -0.24em;
		margin-inline-start: 0.32rem;
	}

	.reveal.open .chev {
		transform: rotate(180deg);
	}

	.translation {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1.55;
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import type { GlossDocument, TextDocument, Word } from '$lib/corpus';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { movementById, movementNeighbors, partVoice } from '$lib/ordo';
	import { role, showsWords } from '$lib/role.svelte';
	import { ribbon } from '$lib/ribbon.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { wordPanel } from '$lib/wordpanel.svelte';

	// Only this movement's texts, from the server load — never the corpus.
	let { data } = $props();
	const texts = $derived(data.texts as Record<string, { doc: TextDocument; gloss: GlossDocument }>);

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
	const movement = $derived(movementById(page.params.movement ?? ''));
	const around = $derived(movementNeighbors(page.params.movement ?? ''));

	// The flow shares the reading page's help ladder and its stored setting.
	let helpLevel = $state(1);

	// Parts the reader has opened for themselves this visit. Folding is a
	// default, never a refusal: one tap and the words are there, and they
	// stay there while the reader is on the page.
	let unfolded = $state<Record<string, boolean>>({});

	// …and its word panel. A word is one tap from its analysis wherever it
	// stands (decisions #20); the flow is not an exception. Several texts
	// share this page, so a word is addressed by text AND id — `credo.w001`
	// — which is also what the ?w= deep link carries.
	const inlined = $derived(
		(movement?.entries ?? []).flatMap((e) => {
			const entry = e.text ? texts[e.text] : undefined;
			return entry ? [{ slug: e.text!.split('/')[1], key: e.text!, entry }] : [];
		})
	);

	const wordsById = $derived(
		new Map<string, { word: Word; doc: TextDocument; slug: string }>(
			inlined.flatMap(({ slug, entry }) =>
				entry.doc.segments.flatMap((seg) =>
					(seg.words ?? []).map((w): [string, { word: Word; doc: TextDocument; slug: string }] => [
						`${slug}.${w.id}`,
						{ word: w, doc: entry.doc, slug }
					])
				)
			)
		)
	);

	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	$effect(() => {
		void page.url;
		void wordsById;
		panel.applyFromLocation();
	});

	const picked = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	const pickedEntry = $derived(picked ? texts[`ordinarium/${picked.slug}`] : null);
	const pickedGloss = $derived(
		picked && pickedEntry ? (pickedEntry.gloss.words[picked.word.id] ?? null) : null
	);
	const pickedAnalysis = $derived(
		picked
			? (picked.word.analysis ?? picked.doc.analysis_defaults_words ?? picked.doc.analysis_defaults)
			: null
	);

	// Dismissal gestures, as on the reading pages: Esc, and a tap on the
	// quiet parts of the page. composedPath, not target.closest — a control
	// that re-renders on click detaches before the event reaches window.
	function onWindowClick(e: MouseEvent) {
		if (panel.id === null) return;
		const interactive = e
			.composedPath()
			.some((n) => n instanceof Element && n.matches('a, button, input, select, textarea, aside'));
		if (!interactive) panel.close();
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && panel.id !== null) panel.close();
	}

	keepAwake();

	// The flow is the longest surface in the book and the one a reader
	// leaves and comes back to mid-Mass — it keeps a ribbon like the rest.
	ribbon(
		() => `scrutabor-pos:ordo/${page.params.movement}`,
		// a deep link into a word outranks the ribbon — that reader asked
		// for a place, the same rule the reading pages follow
		() => new URL(location.href).searchParams.has('w')
	);
</script>

<svelte:window
	onpopstate={panel.applyFromLocation}
	onclick={onWindowClick}
	onkeydown={onWindowKeydown}
/>

<svelte:head>
	<title>{movement ? `${movement.title} — Ordo Missæ` : 'Ordo Missæ'} — Scrutabor</title>
	<meta name="description" content={msgs.ordoDescription} />
</svelte:head>

<div class="page">
	<header>
		<nav>
			<a href="/{lang}" class="back smallcaps">scrutabor</a>
			<div class="nav-right">
				<LangMenu {lang} />
				<ThemeToggle {lang} />
			</div>
		</nav>
		<a href="/{lang}/ordo" class="up smallcaps" lang="la">Ordo Missæ</a>
		<h1 lang="la">{movement?.title ?? ''}</h1>
		<p class="subtitle smallcaps">{movement?.label[lang] ?? ''}</p>
		<div class="help-row">
			<HelpLevels {lang} bind:value={helpLevel} />
			<RolePicker {lang} compact />
		</div>
	</header>

	<main class:panel-open={picked !== null || panel.keepPad}>
		{#each movement?.entries ?? [] as e (e.id)}
			{@const entry = e.text ? texts[e.text] : undefined}
			{@const voices = (entry?.doc.segments ?? [])
				.filter((s) => s.type === 'verse')
				.map((s) => s.voice)}
			{@const words = showsWords(voices, partVoice(e.id), role.value)}
			<section class="part">
				<div class="part-head">
					{#if e.text && entry}
						<a class="part-title" href="/{lang}/{e.text}" lang="la"
							>{e.title}<span class="chev" aria-hidden="true">›</span></a
						>
					{:else}
						<span class="part-title" lang="la">{e.title}</span>
					{/if}
					{#if e.kind !== 'text'}
						<span class="mark smallcaps"
							>{e.kind === 'proper' ? msgs.ordoProper : msgs.ordoPending}</span
						>
					{/if}
				</div>
				<!-- The what-happens line rides with any help, like the rubric
					     narratives it continues (reading-ux §5). -->
				{#if helpLevel >= 1}
					<p class="part-note">
						{e.note[lang]}{#if e.when}<span class="when">{e.when[lang]}</span>{/if}
					</p>
				{/if}
				{#if entry && !words && !unfolded[e.id]}
					<!-- Folded, not hidden: the note above already says what is
					     happening, and the words are one tap away. -->
					<button class="unfold" onclick={() => (unfolded[e.id] = true)}>
						<span class="unfold-what">{msgs.quietCollapsed}</span>
						<span class="unfold-do smallcaps">{msgs.quietReveal}</span>
					</button>
				{/if}
				{#if entry && (words || unfolded[e.id])}
					<div class="part-text">
						<TextBody
							doc={entry.doc}
							gloss={entry.gloss}
							{lang}
							{helpLevel}
							idPrefix={e.text!.split('/')[1]}
							selectedId={panel.id}
							ontap={panel.toggle}
						/>
					</div>
				{/if}
			</section>
		{/each}

		<nav class="pager" aria-label={msgs.pagerAria}>
			{#if around.prev}
				<a class="pager-link" href="/{lang}/ordo/{around.prev.id}"
					><span class="chev" aria-hidden="true">‹</span>
					<span lang="la">{around.prev.title}</span></a
				>
			{:else}
				<span></span>
			{/if}
			{#if around.next}
				<a class="pager-link pager-next" href="/{lang}/ordo/{around.next.id}"
					><span lang="la">{around.next.title}</span>
					<span class="chev" aria-hidden="true">›</span></a
				>
			{/if}
		</nav>
	</main>

	{#if picked && pickedAnalysis}
		<WordPanel
			word={picked.word}
			gloss={pickedGloss}
			analysis={pickedAnalysis}
			lex={data.lex}
			{lang}
			onclose={panel.close}
			onnavigate={(id) => panel.goTo(`${picked.slug}.${id}`)}
		/>
	{/if}
</div>

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
		margin: 0.2rem 0 0;
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
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.8rem 1.6rem;
		margin: 1.4rem 0 2.2rem;
	}

	.up {
		display: block;
		margin: 1.6rem 0 0;
		text-align: center;
		font-size: 0.75rem;
		color: var(--ink-soft);
		text-decoration: none;
	}

	.up:hover {
		color: var(--rubric);
	}

	/* Every part is a station on one road: the rule marks the step, and a
	   part whose text we carry simply continues below it. */
	.part {
		margin: 0 0 1.8rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--border);
	}

	.part-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.part-title {
		font-size: 1.3rem;
		color: var(--ink);
		text-decoration: none;
	}

	a.part-title:hover {
		color: var(--rubric);
	}

	.chev {
		display: inline-block;
		transform: translateY(-0.09em);
		margin-inline: 0.15em;
		color: var(--ink-soft);
	}

	.mark {
		flex: none;
		font-size: 0.7rem;
		color: var(--ink-soft);
	}

	/* A folded prayer: the note above says what is happening, this says
	   the words are here if wanted. Quiet, and the whole line is the
	   target — a thumb in a pew is not precise. */
	.unfold {
		display: flex;
		width: 100%;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 0.2rem 0 0.6rem;
		padding: 0.55rem 0.9rem;
		background: transparent;
		border: 1px dashed var(--border);
		border-radius: 0.4rem;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.95rem;
		text-align: start;
		cursor: pointer;
	}

	.unfold:hover {
		border-color: var(--rubric);
	}

	.unfold:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}

	.unfold-what {
		font-style: italic;
	}

	.unfold-do {
		color: var(--rubric);
		font-size: 0.72rem;
		letter-spacing: 0.09em;
	}

	.part-note {
		margin: 0.3rem 0 0;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.5;
	}

	/* The condition is a footnote to the part, not a clause of its
	   description — the note prose already carries dashes of its own. */
	.when {
		display: block;
		margin-top: 0.2rem;
		font-style: italic;
		font-size: 0.9rem;
	}

	.part-text {
		margin-top: 1.2rem;
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

	/* room for the sheet, so even the last word can rise clear of it */
	main.panel-open {
		padding-bottom: 45vh;
	}
</style>

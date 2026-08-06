<script lang="ts">
	import { page } from '$app/state';
	import type { GlossDocument, TextDocument, Word } from '$lib/corpus';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
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
	let legendOpen = $state(false);

	function openLegend() {
		panel.close();
		legendOpen = true;
	}

	// The prayers this reader is not saying, for the movement as a whole.
	// Knowing the whole set is what lets a RUN of them be named once — "the
	// priest prays these silently" belongs over the twelve prayers of the
	// Canon, not on each of the twelve.
	// A plain array, not a Set: the lint rule against mutable built-in
	// collections in components is right — a Set is not reactive, and this
	// value is rebuilt from scratch whenever the reader changes their part.
	const silent = $derived(
		(movement?.entries ?? [])
			.filter((e) => {
				const entry = e.text ? texts[e.text] : undefined;
				if (!entry) return false;
				const voices = entry.doc.segments.filter((sg) => sg.type === 'verse').map((sg) => sg.voice);
				return !showsWords(voices, partVoice(e.id), role.value);
			})
			.map((e) => e.id)
	);

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
		{#each movement?.entries ?? [] as e, idx (e.id)}
			{@const entry = e.text ? texts[e.text] : undefined}
			{@const voices = (entry?.doc.segments ?? [])
				.filter((s) => s.type === 'verse')
				.map((s) => s.voice)}
			{@const words = showsWords(voices, partVoice(e.id), role.value)}
			{@const folded = !!entry && !words && !unfolded[e.id]}
			{#if silent.includes(e.id) && !silent.includes(movement?.entries[idx - 1]?.id ?? '')}
				<!-- Said once over the run, not on every line of it. -->
				<p class="silent-run smallcaps">{msgs.quietCollapsed}</p>
			{/if}
			<section class="part" class:folded>
				{#if folded}
					<!-- A prayer the reader is not saying costs ONE LINE, not a
					     card: title, what is happening, and the way in. Twelve of
					     these stand between the Sanctus and the Amen a person in
					     the pew answers, and at a card apiece they were most of
					     the page — the reader scrolls past the silence looking
					     for their own next line. Folded, never hidden. -->
					<button class="unfold" onclick={() => (unfolded[e.id] = true)}>
						<span class="unfold-title" lang="la">{e.title}</span>
						{#if helpLevel >= 1}<span class="unfold-what">{e.note[lang]}</span>{/if}
						<span class="unfold-do smallcaps">{msgs.quietReveal}</span>
					</button>
				{:else}
					<div class="part-head">
						{#if e.text && entry}
							<a class="part-title" href="/{lang}/{e.text}" lang="la">{e.title}</a>
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
							onmark={openLegend}
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

	{#if legendOpen}
		<MarkLegend {lang} onclose={() => (legendOpen = false)} />
	{/if}

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
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		margin: 1.5rem 0 0;
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

	/* A dotted rule under it, the way every other link in this book is
	   drawn (the panel's lemma and concept links). The arrow that used to
	   sit here read as punctuation of the Latin title rather than as an
	   affordance. */
	a.part-title {
		border-bottom: 1px dotted var(--rubric);
	}

	a.part-title:hover {
		color: var(--rubric);
		border-bottom-color: var(--rubric);
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
		gap: 0.7rem;
		margin: 0;
		padding: 0.3rem 0;
		background: transparent;
		border: 0;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.95rem;
		text-align: start;
		cursor: pointer;
	}

	/* A run of folded prayers reads as a list, so it needs the spacing of
	   a list rather than of a section. */
	.part.folded {
		margin: 0;
	}

	.silent-run {
		margin: 1.6rem 0 0.3rem;
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		color: var(--ink-soft);
	}

	.unfold-title {
		flex: none;
		color: var(--ink);
	}

	/* The note wraps rather than truncating: this line is the whole of
	   what a reader in the pew is told about a prayer they are not saying,
	   and half of it with an ellipsis is not worth the pixels it saves. */
	.unfold-what {
		flex: 1;
		min-width: 0;
	}

	.unfold:hover .unfold-title,
	.unfold:hover .unfold-do {
		color: var(--rubric);
	}

	.unfold:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
	}

	.unfold-do {
		flex: none;
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

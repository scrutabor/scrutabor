<script lang="ts">
	import { goto } from '$app/navigation';
	import { pageUrl } from '$lib/url';
	import type { GlossDocument, TextDocument, Word } from '$lib/corpus';
	import { arrowNav } from '$lib/arrow-nav';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { movementById, movementNeighbors, partVoice, type OrdoEntry } from '$lib/ordo';
	import { role, showsWords } from '$lib/role.svelte';
	import { ribbon } from '$lib/ribbon.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { wordPanel } from '$lib/wordpanel.svelte';
	import { proper } from '$lib/proper.svelte';
	import DayPicker from '$lib/components/DayPicker.svelte';
	import { dayHref } from '$lib/proper.svelte';

	// Only this movement's texts, from the server load — never the corpus.
	let { data } = $props();
	const texts = $derived(data.texts as Record<string, { doc: TextDocument; gloss: GlossDocument }>);

	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const movement = $derived(movementById(data.movement));
	// Whether this movement has a slot the day fills.
	const hasProper = $derived((movement?.entries ?? []).some((e) => e.kind === 'proper'));
	const around = $derived(movementNeighbors(data.movement));

	// The flow shares the reading page's help ladder and its stored setting.
	let helpLevel = $state(1);

	// Parts the reader has opened for themselves this visit. Folding is a
	// default, never a refusal: one tap and the words are there, and they
	// stay there while the reader is on the page.
	let unfolded = $state<Record<string, boolean>>({});

	// The Ordo is exactly where paging by key is worth having — the reader
	// is walking the Mass movement by movement — and it was the one surface
	// without it (owner, 2026-08-09). Through dayHref like the pager below:
	// the address bar has to tell the truth about what is displayed, and an
	// arrow key must not be the one way of turning the page that drops it.
	const onWindowKeydown = arrowNav((dir) => {
		const t = dir === 'prev' ? around.prev : around.next;
		return t ? dayHref(`/app/${lang}/ordo/${t.id}`) : undefined;
	});
	let legendOpen = $state(false);

	function openLegend() {
		panel.close();
		legendOpen = true;
	}

	function tapWord(id: string) {
		legendOpen = false;
		panel.toggle(id);
	}

	// The prayers this reader is not saying, for the movement as a whole.
	// Knowing the whole set is what lets a RUN of them be named once — "the
	// priest prays these silently" belongs over the twelve prayers of the
	// Canon, not on each of the twelve.
	// A plain array, not a Set: the lint rule against mutable built-in
	// collections in components is right — a Set is not reactive, and this
	// value is rebuilt from scratch whenever the reader changes their part.
	// What a given part of the spine actually shows. Usually one text, from
	// this page's own prerendered data. For a `proper` slot it is whatever the
	// chosen day supplies — nothing at all until a day is chosen, and MORE
	// THAN ONE where the rite folds several parts into a slot: gradual and
	// alleluia share the chant between the readings.
	//
	// Everything on this page goes through here. Before it existed, three
	// places each wrote `e.text ? texts[e.text] : undefined` and a fourth
	// looked words up under `ordinarium/`, which no proper slug matches.
	const bodiesFor = $derived((e: OrdoEntry) => {
		if (e.text) {
			const entry = texts[e.text];
			return entry ? [{ key: e.text, slug: e.text.split('/')[1], ...entry }] : [];
		}
		if (e.kind !== 'proper') return [];
		return proper.forSlot(e.id).map((part) => ({
			key: part.key,
			slug: part.key.split('/')[1],
			doc: part.doc as TextDocument,
			gloss: part.gloss as GlossDocument
		}));
	});

	const silent = $derived(
		(movement?.entries ?? [])
			.filter((e) => {
				const entry = bodiesFor(e)[0];
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
		(movement?.entries ?? []).flatMap((e) =>
			bodiesFor(e).map(({ key, slug, doc, gloss }) => ({ slug, key, entry: { doc, gloss } }))
		)
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
		void wordsById;
		panel.applyFromLocation();
	});

	const picked = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	// By slug among what this page shows, not by a guessed category. The
	// Proper's slugs are not under `ordinarium/`, and the old lookup would
	// have returned undefined for every one of them.
	// The page's own dictionary plus the chosen day's. Merged PER MAP, not by
	// spreading the pair: `narrowLexicon` returns { lemmata, senses }, so a
	// shallow spread replaces both wholesale and every word of the Ordinary
	// loses its entry the moment a day is chosen.
	const mergedLex = $derived({
		lemmata: { ...data.lex.lemmata, ...(proper.payload?.lex?.lemmata ?? {}) },
		senses: { ...data.lex.senses, ...(proper.payload?.lex?.senses ?? {}) }
	});

	const pickedEntry = $derived(
		picked ? (inlined.find((i) => i.slug === picked.slug)?.entry ?? null) : null
	);
	const pickedGloss = $derived(
		picked && pickedEntry ? (pickedEntry.gloss.words[picked.word.id] ?? null) : null
	);
	const pickedAnalysis = $derived(
		picked
			? (picked.word.analysis ?? picked.doc.analysis_defaults_words ?? picked.doc.analysis_defaults)
			: null
	);

	keepAwake();

	// The flow is the longest surface in the book and the one a reader
	// leaves and comes back to mid-Mass — it keeps a ribbon like the rest.
	ribbon(
		() => `scrutabor-pos:ordo/${data.movement}`,
		// a deep link into a word outranks the ribbon — that reader asked
		// for a place, the same rule the reading pages follow
		() => pageUrl().searchParams.has('w')
	);
</script>

<svelte:window
	onpopstate={panel.applyFromLocation}
	onkeydown={(e) => {
		const href = onWindowKeydown(e);
		if (href) goto(href);
	}}
/>

<svelte:head>
	<title>{movement ? `${movement.title} — Ordo Missæ` : 'Ordo Missæ'} — Scrutabor</title>
	<meta name="description" content={msgs.ordoDescription} />
</svelte:head>

<div class="page reading">
	<header>
		<PageNav
			{lang}
			parent={dayHref(`/app/${lang}/ordo`)}
			parentLabel="Ordo Missæ"
			parentLang="la"
		/>
		<h1 lang="la">{movement?.title ?? ''}</h1>
		<p class="subtitle smallcaps">{movement?.label[lang] ?? ''}</p>
		<div class="help-row">
			<HelpLevels {lang} bind:value={helpLevel} />
			<!-- The day leads the three settings for the same reason it does on
			     the index, and appears only where it has something to fill:
			     three of the six movements carry no proper slot at all — the
			     preparation, the Canon and the communion are the same at every
			     Mass — and a control that changes nothing on the page in front
			     of the reader is a control that says the page is broken. -->
			{#if hasProper}
				<DayPicker {lang} compact />
			{/if}
			<RolePicker {lang} compact />
			<RolePicker {lang} compact kind="mass" />
		</div>
	</header>

	<main class:panel-open={picked !== null || panel.keepPad}>
		{#each movement?.entries ?? [] as e, idx (e.id)}
			{@const bodies = bodiesFor(e)}
			{@const entry = bodies[0]}
			{@const voices = (entry?.doc.segments ?? [])
				.filter((s) => s.type === 'verse')
				.map((s) => s.voice)}
			{@const words = showsWords(voices, partVoice(e.id), role.value)}
			{@const folded = !!entry && !words && !unfolded[e.id]}
			{#if silent.includes(e.id) && !silent.includes(movement?.entries[idx - 1]?.id ?? '')}
				<!-- Said once over the run, not on every line of it. -->
				<p class="silent-run smallcaps">{msgs.quietCollapsed}</p>
			{/if}
			{@const revealed = !!entry && !words && !!unfolded[e.id]}
			<section class="part" class:folded class:revealed>
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
						{#if entry}
							<a class="part-title" href="/app/{lang}/{entry.key}" lang="la">{e.title}</a>
						{:else}
							<span class="part-title" lang="la">{e.title}</span>
						{/if}
						{#if e.kind !== 'text'}
							<span class="mark smallcaps"
								>{e.kind === 'proper' ? msgs.ordoProper : msgs.ordoPending}</span
							>
						{/if}
						<!-- Opened by the reader, not theirs to say: it keeps saying
						     so, and it can be shut again. Without this the text
						     arrived inline with nothing to mark it as an aside and
						     no way back (owner, 2026-08-09). -->
						{#if revealed}
							<span class="aside-mark smallcaps">{msgs.quietAside}</span>
							<button class="refold smallcaps" onclick={() => (unfolded[e.id] = false)}
								>{msgs.quietHide}</button
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
						<!-- One slot can hold more than one text: the chant between
						     the readings is gradual AND alleluia, and in Lent a
						     tract instead. Each keeps its own word ids. -->
						{#each bodies as body (body.key)}
							<TextBody
								doc={body.doc}
								gloss={body.gloss}
								{lang}
								{helpLevel}
								idPrefix={body.slug}
								selectedId={panel.id}
								ontap={tapWord}
								onmark={openLegend}
							/>
						{/each}
					</div>
				{/if}
			</section>
		{/each}

		<Pager
			{lang}
			prev={around.prev && {
				href: dayHref(`/app/${lang}/ordo/${around.prev.id}`),
				title: around.prev.title
			}}
			next={around.next && {
				href: dayHref(`/app/${lang}/ordo/${around.next.id}`),
				title: around.next.title
			}}
		/>
	</main>

	{#if legendOpen}
		<MarkLegend {lang} onclose={() => (legendOpen = false)} />
	{/if}

	{#if picked && pickedAnalysis}
		<WordPanel
			word={picked.word}
			gloss={pickedGloss}
			analysis={pickedAnalysis}
			lex={mergedLex}
			{lang}
			onclose={panel.close}
			onnavigate={(id) => panel.goTo(`${picked.slug}.${id}`)}
		/>
	{/if}
</div>

<style>
	/* The rule closes the top section, so it sits nearer to what it closes
	   than to what comes after it — overshooting that put it closer to the
	   first prayer and it read as that prayer's opening rule instead. */
	.page > header {
		padding-bottom: 1.3rem;
	}

	.part:first-of-type {
		padding-top: 2.2rem;
	}

	/* Every part is a station on one road: the rule marks the step, and a
	   part whose text we carry simply continues below it. */
	.part {
		margin: 0 0 1.8rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--border);
	}

	/* The mark takes its own line rather than the margin. At the largest
	   print on a 320px phone the title and *from the day's formulary* want
	   more than the measure between them, and `flex: none` meant the mark
	   went past the right edge and took the page with it, 58px of sideways
	   scroll on eleven slots. Wrapped, it keeps its side of the line. */
	.part-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.2rem 1rem;
	}

	/* An opened aside keeps the quiet ink of the fold it came from, so the
	   eye still reads it as something set apart from the reader's own
	   lines, and it carries its own way back. */
	.aside-mark {
		margin-inline-start: auto;
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		color: var(--ink-soft);
	}

	.refold {
		border: 0;
		background: none;
		padding: 0;
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		color: var(--rubric);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	.refold:hover {
		text-decoration-thickness: 2px;
	}

	.part.revealed .part-text {
		/* --wash-strong, the same quiet ink .seg-extra uses: --rule stood
		   here once and is not a token, and an invalid var() silently voids
		   the whole shorthand — the rule this comment promises was not
		   being painted at all. */
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: 1rem;
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

	.mark {
		flex: none;
		margin-inline-start: auto;
		font-size: 0.7rem;
		color: var(--ink-soft);
	}

	/* A folded prayer: the note above says what is happening, this says
	   the words are here if wanted. Quiet, and the whole line is the
	   target — a thumb in a pew is not precise. */
	.unfold {
		display: flex;
		/* One line while the three parts fit, and as many as it takes when
		   they do not — at the largest reading size on the narrowest phone
		   the name alone fills the column, and a row that cannot wrap
		   pushes the whole page sideways instead. */
		flex-wrap: wrap;
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

	/* The name may wrap rather than hold the row open. It was `flex: none`,
	   which is right until the text is large: at the largest reading size on
	   a 320px phone "Meménto (defunctórum)" alone is wider than the column,
	   and an unshrinkable item pushes the whole page sideways. */
	.unfold-title {
		flex: 0 1 auto;
		min-width: 0;
		/* Last resort, and only when a single word genuinely cannot fit:
		   "(defunctórum)" at the largest reading size is wider than a
		   320px column on its own. This is the NAME of a folded prayer,
		   a label for navigating by — not liturgical text, where a broken
		   word would be unacceptable and the token invariant forbids it. */
		overflow-wrap: break-word;
		color: var(--ink);
	}

	/* The note wraps rather than truncating: this line is the whole of
	   what a reader in the pew is told about a prayer they are not saying,
	   and half of it with an ellipsis is not worth the pixels it saves. */
	.unfold-what {
		/* A BASIS, not 1 1 0: with a zero basis this never wraps, it is
		   merely crushed — at the largest reading size on a 320px phone it
		   was squeezed into 30px beside the title and its text spilled
		   straight out of the page. Given a basis it drops below the title
		   when the two will not share a line. */
		flex: 1 1 9rem;
		min-width: 0;
		overflow-wrap: break-word;
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

	/* room for the sheet, so even the last word can rise clear of it */
	main.panel-open {
		padding-bottom: 45vh;
	}

	@media print {
		.page > header {
			padding-bottom: 9pt;
		}

		main.panel-open {
			padding-bottom: 0;
		}

		.part:first-of-type {
			padding-top: 9pt;
		}

		.part {
			margin: 0 0 11pt;
			padding-top: 7pt;
			break-inside: auto;
		}

		.part.folded {
			margin-bottom: 4pt;
			padding-top: 2pt;
		}

		.part-head,
		.part-note,
		.unfold {
			break-after: avoid;
		}

		.part-title,
		.unfold-title {
			font-size: 1.1rem;
		}

		a.part-title {
			border-bottom: 0;
		}

		.unfold {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0 4pt;
			padding: 0;
			cursor: default;
			color: var(--ink);
		}

		.unfold-title,
		.unfold-what {
			display: inline;
		}

		.unfold-what {
			flex: 1 1 12rem;
			margin-top: 0;
			font-size: 0.75rem;
			line-height: 1.35;
			color: var(--ink-soft);
		}

		.unfold-what::before {
			content: '· ';
		}

		.unfold-do,
		.aside-mark,
		.refold {
			display: none;
		}

		.silent-run {
			margin-top: 9pt;
		}

		.part-note {
			font-size: 0.75rem;
			line-height: 1.35;
		}

		.part-text {
			margin-top: 6pt;
		}
	}
</style>

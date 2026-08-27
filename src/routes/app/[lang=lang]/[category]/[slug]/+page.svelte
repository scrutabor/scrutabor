<script lang="ts">
	import { untrack } from 'svelte';
	import { pageUrl } from '$lib/url';
	import { goto, replaceState } from '$app/navigation';
	import { arrowNav } from '$lib/arrow-nav';
	import { sectionFor, textFor } from '$lib/catalog';
	import HelpLevels, { initialHelp } from '$lib/components/HelpLevels.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { prayerForm } from '$lib/prayer-form.svelte';
	import { ribbon } from '$lib/ribbon.svelte';
	import { docWordPanel } from '$lib/wordpanel.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';
	import {
		formatSegmentSelection,
		parseSegmentSelection,
		segmentRange
	} from '$lib/segment-selection';
	import { offersMassFormChoice, offersRoleChoice } from '$lib/reading-settings';

	// The corpus arrives from the server load, already narrowed to this text
	// — the browser never receives the whole snapshot (see +page.server.ts).
	let { data } = $props();

	const lang = $derived(data.lang as Lang);

	const msgs = $derived(M[lang]);
	const doc = $derived(data.doc);

	// Role and Mass form are independent questions. Each row is offered only
	// when choosing it changes the rendered text; a devotional V./R. dialogue,
	// for example, is not thereby a sung/low Mass variant.
	const hasRoleChoice = $derived(offersRoleChoice(doc.segments));
	const hasMassFormChoice = $derived(offersMassFormChoice(doc.segments));
	const gloss = $derived(data.gloss);
	// A reading names the text itself ("Chwała Ojcu"), not merely
	// the shelf it came from ("Modlitwy"). Non-catalogue corpus texts retain
	// the section name as a safe fallback when reached by a direct link.
	const readingLabel = $derived(
		textFor(data.category, data.slug)?.localizedTitle[lang] ??
			sectionFor(data.category)?.label[lang] ??
			''
	);
	// Book navigation: the catalog's flattened order — within ordinarium
	// that is the liturgical sequence, so a reader can follow the Mass
	// text to text without returning to the catalog.
	const around = $derived(data.around);
	const repeatedSegments = $derived(
		data.category === 'orationes' && data.slug === 'angelus-domini' ? ['s03', 's06', 's09'] : []
	);
	const hasDevotionalLeader = $derived(
		doc.segments.some((sg) => sg.type === 'verse' && sg.speaker === 'ductor')
	);
	const hasPrayerForms = $derived(
		data.category === 'orationes' && data.slug === 'sub-tuum-praesidium'
	);

	// Three verbosity states:
	// 0 = text only · 1 = + interlinear glosses · 2 = + translations (as
	// always-open boxes, no toggles) and rubric narratives
	let helpLevel = $state(initialHelp());

	// The panel behaves the same here as in the flow and on the landing's
	// specimen — one document, one wiring (see lib/wordpanel).
	const wp = docWordPanel(
		() => data.doc,
		() => data.gloss
	);
	const panel = wp.panel;

	// Reading is the whole point of this page: hold the screen open.
	keepAwake();

	// The book's ribbon, keyed by text (see lib/ribbon): a deep link into a
	// word or a cited verse outranks it — that reader asked for a place.
	ribbon(
		() => `scrutabor-pos:${data.category}/${data.slug}`,
		() => {
			// Only a citation that RESOLVES outranks the reading position: a
			// stale or malformed parameter is about to be stripped from the
			// address, and it must not also cost the reader their place.
			const q = pageUrl().searchParams;
			const w = q.get('w');
			const wordCited =
				w !== null && doc.segments.some((sg) => sg.words?.some((word) => word.id === w));
			const v = q.get('v');
			const verseCited =
				v !== null && data.verses !== undefined && Object.values(data.verses).includes(Number(v));
			const ids = doc.segments.map((segment) => segment.id);
			const segmentsCited =
				parseSegmentSelection(q.get('s'), ids, doc.retired_segments ?? {}).length > 0;
			return wordCited || verseCited || segmentsCited;
		}
	);

	// The psalter's verses are addressable: a tapped number cites its
	// verse in the URL (?v=34) the way a tapped word travels as ?w= —
	// shareable, and the page opens scrolled to the verse it names.
	// replaceState, not push: citing is a bookmarkable state, not a step
	// a reader should have to back out of.
	let citedVerse = $state<number | null>(null);
	let citedSegments = $state<string[]>([]);
	let segmentAnchor = $state<string | null>(null);

	function applyVerseFromLocation(scroll = true) {
		if (!data.verses) return;
		const raw = pageUrl().searchParams.get('v');
		const n = raw === null ? null : Number(raw);
		const target = n !== null && Object.values(data.verses).includes(n) ? n : null;
		citedVerse = target;
		if (target !== null && scroll) {
			requestAnimationFrame(() =>
				document.getElementById(`v${target}`)?.scrollIntoView({ block: 'center' })
			);
		}
	}

	function applySegmentFromLocation(scroll = true) {
		const raw = pageUrl().searchParams.get('s');
		const ids = doc.segments.map((segment) => segment.id);
		const selected = parseSegmentSelection(raw, ids, doc.retired_segments ?? {});
		// The address is canonicalized in place: a retired id resolves to its
		// survivor, a reversed or degenerate range straightens, and a selector
		// naming nothing is dropped — so a stale parameter cannot linger and
		// quietly suppress reading-position restore.
		const canonical = formatSegmentSelection(selected, ids);
		if (raw !== null && raw !== canonical) {
			// After the frame, not during it: on a cold arrival this runs in
			// the hydration effect flush, where the router is not yet taking
			// history calls — an immediate replaceState there kills hydration.
			requestAnimationFrame(() => {
				const url = pageUrl();
				if (canonical) url.searchParams.set('s', canonical);
				else url.searchParams.delete('s');
				replaceState(url, {});
			});
		}
		const target = selected[0];
		citedSegments = selected;
		segmentAnchor = target ?? null;
		revealSelection(selected);
		if (target && scroll) {
			requestAnimationFrame(() =>
				document.getElementById(target)?.scrollIntoView({ block: 'center' })
			);
		}
	}

	// A link must show what it names. When the target lies outside the basic
	// prayer form's rendered slice, the page switches itself to the extended
	// form — the arriving reader cannot know the verse hides behind a tab.
	// untrack: the reveal answers an ARRIVING address, once. Reading the
	// form's value reactively made the effect re-extend the moment the
	// reader switched back by hand — a tab that could not be left.
	function revealSelection(selected: string[]) {
		if (!hasPrayerForms || untrack(() => prayerForm.value) === 'extended') return;
		const visible = new Set(doc.segments.slice(0, 1).map((segment) => segment.id));
		if (selected.some((id) => !visible.has(id))) prayerForm.set('extended');
	}

	function revealWordFromLocation() {
		if (!hasPrayerForms || untrack(() => prayerForm.value) === 'extended') return;
		const w = pageUrl().searchParams.get('w');
		if (w === null) return;
		const owner = doc.segments.find((segment) => segment.words?.some((word) => word.id === w));
		if (owner && owner.id !== doc.segments[0]?.id) prayerForm.set('extended');
	}

	function writeSegmentSelection(selected: string[]) {
		const url = pageUrl();
		const value = formatSegmentSelection(
			selected,
			doc.segments.map((segment) => segment.id)
		);
		if (value) {
			url.searchParams.set('s', value);
			// The verse citation and the verse selection are one story: when
			// the parameter goes, its rendered state goes with it, now.
			url.searchParams.delete('v');
			citedVerse = null;
		} else url.searchParams.delete('s');
		replaceState(url, {});
	}

	function selectSegment(id: string, extend: boolean) {
		if (panel.id !== null) {
			// A verse tap under an open panel both selects and dismisses. The
			// panel's close pops its own history entry — writing ?s= first
			// would put the selection on the entry about to vanish, so the
			// write waits for the history to settle.
			panel.close();
			if (new URL(location.href).searchParams.has('w')) {
				const once = () => {
					removeEventListener('popstate', once);
					applySelection(id, extend);
				};
				addEventListener('popstate', once);
			} else {
				applySelection(id, extend);
			}
			return;
		}
		applySelection(id, extend);
	}

	function applySelection(id: string, extend: boolean) {
		const ids = doc.segments.map((segment) => segment.id);
		if (extend && segmentAnchor) {
			citedSegments = segmentRange(ids, segmentAnchor, id);
		} else if (citedSegments.length === 1 && citedSegments[0] === id) {
			citedSegments = [];
			segmentAnchor = null;
		} else {
			citedSegments = [id];
			segmentAnchor = id;
		}
		writeSegmentSelection(citedSegments);
	}

	$effect(() => {
		void data.verses;
		applyVerseFromLocation();
		applySegmentFromLocation();
		revealWordFromLocation();
	});

	function tapVerse(no: number) {
		citedVerse = citedVerse === no ? null : no;
		const url = pageUrl();
		if (citedVerse === null) url.searchParams.delete('v');
		else {
			url.searchParams.set('v', String(citedVerse));
			url.searchParams.delete('s');
			citedSegments = [];
			segmentAnchor = null;
		}
		replaceState(url, {});
	}

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

	const onWindowKeydown = arrowNav((dir) => {
		const t = dir === 'prev' ? around.prev : around.next;
		return t ? `/app/${lang}/${t.category}/${t.slug}` : undefined;
	});

	let selectedWord = $derived(wp.word);
	let selectedGloss = $derived(wp.gloss);
	let selectedAnalysis = $derived(wp.analysis);
</script>

<svelte:window
	onpopstate={() => {
		panel.applyFromLocation();
		// History still restores which line is cited, but it is not a fresh
		// arrival at that citation. In particular, closing a word panel pops its
		// shallow history entry and must leave the reader exactly where they are.
		applyVerseFromLocation(false);
		applySegmentFromLocation(false);
	}}
	onkeydown={(e) => {
		const href = onWindowKeydown(e);
		if (href) goto(href);
	}}
/>

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
		<header class:without-opening-rubric={data.category === 'ordinarium'}>
			<PageNav {lang} />
			<h1 lang="la">{doc.title}</h1>
			<p class="subtitle smallcaps">{readingLabel}</p>
			<div class="help-row">
				<div class="tabella">
					<HelpLevels {lang} bind:value={helpLevel} />
					{#if hasRoleChoice}<RolePicker {lang} />{/if}
					{#if hasMassFormChoice}<RolePicker {lang} kind="mass" />{/if}
				</div>
			</div>
			{#if gloss.about}
				<!-- Closed in EVERY reading mode (owner rule): the
				     introduction is one tap away, never ambient. It opens as
				     a bottom sheet — the reading layout never reflows. -->
				<button class="about-pill smallcaps" aria-expanded={aboutOpen} onclick={toggleAbout}
					>{msgs.aboutLabel}</button
				>
			{/if}
		</header>

		<main class:panel-open={selectedWord !== null || panel.keepPad}>
			{#if hasPrayerForms}
				<section class="prayer-forms">
					<div class="form-tabs" role="group" aria-label={msgs.prayerFormsLabel}>
						<button
							class:active={prayerForm.value === 'basic'}
							aria-pressed={prayerForm.value === 'basic'}
							onclick={() => prayerForm.set('basic')}
						>
							{msgs.prayerFormShort}
						</button>
						<button
							class:active={prayerForm.value === 'extended'}
							aria-pressed={prayerForm.value === 'extended'}
							onclick={() => prayerForm.set('extended')}
						>
							{msgs.prayerFormLong}
						</button>
					</div>
					<TextBody
						doc={prayerForm.value === 'extended'
							? doc
							: { ...doc, segments: doc.segments.slice(0, 1) }}
						{gloss}
						{lang}
						{helpLevel}
						selectedId={panel.id}
						ontap={tapWord}
						{citedSegments}
						onsegmentselect={selectSegment}
					/>
				</section>
			{:else}
				<TextBody
					{doc}
					{gloss}
					{lang}
					{helpLevel}
					selectedId={panel.id}
					ontap={tapWord}
					onmark={openLegend}
					verses={data.verses}
					onverse={data.verses ? tapVerse : undefined}
					{citedVerse}
					{citedSegments}
					onsegmentselect={selectSegment}
					collapsedSegments={repeatedSegments}
					litanyColumns={data.category === 'litaniae'}
					showSpeakerNames={!hasDevotionalLeader}
					hideOpeningRubric={data.category === 'ordinarium'}
				/>
			{/if}

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
				<SourceNotes citations={gloss.about_citations} {lang} />
			</Sheet>
		{/if}

		{#if legendOpen}
			<MarkLegend {lang} devotional={hasDevotionalLeader} onclose={() => (legendOpen = false)} />
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

	/* The ordinary reading rhythm reserved this full step for the opening
	   process rubric. Standalone Mass prayers now leave that rubric to the
	   Ordo, so keeping its entire approach made the prayer appear to begin
	   one absent block too low. */
	.page > header.without-opening-rubric {
		padding-bottom: 1.5rem;
	}

	main.panel-open {
		padding-bottom: 45vh;
	}

	/* Named, like the pickers' own containers and for their reason: the
	   query answers the room the tabs actually have, which the reading-size
	   knob changes and a px media query cannot see. */
	.prayer-forms {
		container: tabs / inline-size;
	}

	.form-tabs {
		display: flex;
		width: fit-content;
		max-width: 100%;
		margin: 0 auto 1.75rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		overflow: hidden;
	}

	.form-tabs button {
		padding: 0.48rem 1.15rem;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.form-tabs button + button {
		border-inline-start: 1px solid var(--border);
	}

	.form-tabs button.active {
		background: var(--wash);
		color: var(--ink);
	}

	.form-tabs button:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: -2px;
	}

	.form-tabs button:first-child {
		border-start-start-radius: 999px;
		border-end-start-radius: 999px;
	}

	.form-tabs button:last-child {
		border-start-end-radius: 999px;
		border-end-end-radius: 999px;
	}

	/* 27rem is the old 430px, now answering the reading size too: at the
	   largest print a wide phone has the same shortage of room the query
	   was written for, and a px breakpoint kept the wide treatment there. */
	@container tabs (max-width: 27rem) {
		.form-tabs {
			width: 100%;
		}

		.form-tabs button {
			flex: 1;
			padding-inline: 0.55rem;
			font-size: 0.82rem;
		}
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

	@media print {
		.page > header,
		.page > header.without-opening-rubric {
			padding-bottom: 9pt;
		}

		main.panel-open {
			padding-bottom: 0;
		}

		.form-tabs,
		.about-pill {
			display: none;
		}
	}
</style>

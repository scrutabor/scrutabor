<script lang="ts">
	import { untrack } from 'svelte';
	import { pageUrl } from '$lib/url';
	import { replaceState } from '$app/navigation';
	import { arrowNav } from '$lib/arrow-nav';
	import { initialHelp } from '$lib/components/HelpLevels.svelte';
	import AboutSheet from '$lib/components/AboutSheet.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import ReadingControls from '$lib/components/ReadingControls.svelte';
	import SelectedWordPanel from '$lib/components/SelectedWordPanel.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { prayerForm } from '$lib/prayer-form.svelte';
	import { openPage } from '$lib/page-navigation';
	import { ribbon } from '$lib/ribbon.svelte';
	import { docWordPanel, wordPanelSelection } from '$lib/wordpanel.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { resolveDocumentAddress, writeReadingAddress } from '$lib/reading-address';
	import { presentReadingLocation, readingLocationFrame } from '$lib/reading-location';
	import {
		formatSegmentSelection,
		parseSegmentSelection,
		resolveWordAddress,
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
	// A reading names the text itself ("Chwała Ojcu"), not merely the
	// shelf it came from ("Modlitwy") — resolved by the load (lib/loaders),
	// so this page never carries the catalogue.
	const readingLabel = $derived(data.label);
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

	function resolveCitedWord(raw: string | null) {
		return resolveWordAddress(
			raw,
			doc.segments.flatMap((segment) => (segment.words ?? []).map((word) => word.id)),
			doc.segments.map((segment) => segment.id),
			doc.retired_words ?? {},
			doc.retired_segments ?? {}
		);
	}

	// The book's ribbon, keyed by text (see lib/ribbon): a deep link into a
	// word or a cited verse outranks it — that reader asked for a place.
	ribbon(
		() => `scrutabor-pos:${data.category}/${data.slug}`,
		() => {
			// Only a citation that RESOLVES outranks the reading position: a
			// stale or malformed parameter is about to be stripped from the
			// address, and it must not also cost the reader their place.
			const q = pageUrl().searchParams;
			const wordCited = resolveCitedWord(q.get('w'));
			const v = q.get('v');
			const verseCited =
				v !== null && data.verses !== undefined && Object.values(data.verses).includes(Number(v));
			const ids = doc.segments.map((segment) => segment.id);
			const segmentsCited =
				parseSegmentSelection(q.get('s'), ids, doc.retired_segments ?? {}).length > 0;
			return wordCited !== null || verseCited || segmentsCited;
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

	const locationFrame = readingLocationFrame();
	const cancelLocationFrame = locationFrame.cancel;

	function applyAddressFromLocation(scroll = true) {
		cancelLocationFrame();
		const url = pageUrl();
		const original = url.href;
		const resolved = resolveDocumentAddress(
			doc,
			url.searchParams.get('w'),
			url.searchParams.get('s')
		);
		writeReadingAddress(url, resolved);
		citedSegments = resolved.segments;
		segmentAnchor = resolved.segments[0] ?? null;
		const owner = resolved.word
			? doc.segments.find((segment) => segment.words?.some((word) => word.id === resolved.word))
			: null;
		revealSelection([...resolved.segments, ...(owner ? [owner.id] : [])]);

		// One guarded update after hydration preserves an explicit segment
		// selection while repairing a word, and cannot overwrite a later tap.
		locationFrame.schedule(() => {
			if (pageUrl().href !== original) return;
			presentReadingLocation(url, original, resolved, () => panel.applyFromLocation(), scroll);
		});
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
		// A verse tap under an open panel both selects and dismisses; the
		// selection is written once the panel's own history entry is gone.
		panel.closeThen(() => applySelection(id, extend));
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
		applyAddressFromLocation();
		return cancelLocationFrame;
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
	let selectedDetails = $derived(
		selectedWord ? wordPanelSelection(selectedWord, doc, gloss) : null
	);
</script>

<svelte:window
	onpopstate={() => {
		panel.applyFromLocation();
		// History still restores which line is cited, but it is not a fresh
		// arrival at that citation. In particular, closing a word panel pops its
		// shallow history entry and must leave the reader exactly where they are.
		applyVerseFromLocation(false);
		applyAddressFromLocation(false);
	}}
	onkeydown={(e) => {
		const href = onWindowKeydown(e);
		if (href) openPage(href);
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
			<ReadingControls {lang} bind:value={helpLevel} {hasRoleChoice} {hasMassFormChoice} />
			{#if gloss.about || data.bibliography.context.length}
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
						verifiedTranslationCitations={data.bibliography.translation}
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
					verifiedTranslationCitations={data.bibliography.translation}
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

		{#if aboutOpen && (gloss.about || data.bibliography.context.length)}
			<AboutSheet
				{lang}
				about={gloss.about}
				citations={data.bibliography.context}
				onclose={() => (aboutOpen = false)}
			/>
		{/if}

		{#if legendOpen}
			<MarkLegend {lang} devotional={hasDevotionalLeader} onclose={() => (legendOpen = false)} />
		{/if}

		<SelectedWordPanel
			word={selectedWord}
			details={selectedDetails}
			lex={data.lex}
			{lang}
			onclose={panel.close}
			onnavigate={panel.goTo}
		/>
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

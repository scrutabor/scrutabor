<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { pageUrl } from '$lib/url';
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import { arrowNav } from '$lib/arrow-nav';
	import HelpLevels, { initialHelp } from '$lib/components/HelpLevels.svelte';
	import ContentLoader from '$lib/components/ContentLoader.svelte';
	import ComponentConditionNote from '$lib/components/ComponentConditionNote.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import SelectedWordPanel from '$lib/components/SelectedWordPanel.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import { textFlowFor } from '$lib/reading-flow';
	import type { FlowRow } from '$lib/text-flow';
	import { M, type Lang } from '$lib/i18n';
	import { openPage } from '$lib/page-navigation';
	import { movementById, movementNeighbors, partVoice, type OrdoEntry } from '$lib/ordo';
	import { role, showsWords } from '$lib/role.svelte';
	import { massForm } from '$lib/mass-form.svelte';
	import { voicesInMassForm } from '$lib/participation-performance';
	import { ribbon } from '$lib/ribbon.svelte';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { wordPanel, wordPanelSelection } from '$lib/wordpanel.svelte';
	import { proper } from '$lib/proper.svelte';
	import { isCanonRole } from '$lib/canon';
	import { ordinaryApplicability } from '$lib/ordinary-applicability';
	import { ordinaryOmission } from '$lib/ordinary-omission';
	import { DISMISSAL_ROLE } from '$lib/dismissal';
	import {
		ordoBlessingContext,
		ordoContext,
		ordoEntryVisibility,
		ordoMinisterBlessingContext,
		ordoResponseContext
	} from '$lib/ordo-context';
	import DayPicker from '$lib/components/DayPicker.svelte';
	import FormularyScopeNote from '$lib/components/FormularyScopeNote.svelte';
	import { dayHref } from '$lib/proper.svelte';
	import type { TextBibliographyEvidence } from '$lib/bibliography';
	import { textHref } from '$lib/content-url';
	import { commemorationEntryHref } from '$lib/commemoration-entry-url';
	import { textAnchor } from '$lib/text-anchor';
	import { resolveCompositeAddress, writeReadingAddress } from '$lib/reading-address';
	import { presentReadingLocation, readingLocationFrame } from '$lib/reading-location';
	import { indexOccurrenceWords } from '$lib/proper-occurrences';
	import { DAY_PARAM, MASS_PARAM, resolveOrdoChoice, writeOrdoChoice } from '$lib/ordo-choice';
	import { COMMEMORATION_SLOTS, commemorationName, type Situation } from '$lib/commemorationes';

	/** The commemoration body a variant head labels: its situation and whether its Secret ends aloud. */
	type VariantBody = { situation?: Situation; nonfinal?: boolean };
	import type { IntroductionBody } from '$lib/introductiones';
	import type { CommemorationVariant } from '$lib/proper.svelte';
	import {
		announcedReadings,
		readingPayloadReady,
		type AnnouncementOwner
	} from '$lib/reading-announcements';

	// Only this movement's texts, from the server load — never the corpus.
	let { data } = $props();
	const texts = $derived(
		data.texts as Record<
			string,
			{ doc: TextDocument; gloss: GlossDocument; bibliography: TextBibliographyEvidence }
		>
	);

	// The greeting, its answer and Orémus that open a part, the same on every day: read on the
	// server from their owner texts, independent of whatever the day supplies for that part.
	const introductions = $derived(
		(data.introductions ?? {}) as unknown as Record<string, IntroductionBody[]>
	);
	const introductionsFor = (e: OrdoEntry) => (omissionFor(e) ? [] : (introductions[e.id] ?? []));
	const readingOwners = $derived((data.readingOwners ?? {}) as Record<string, AnnouncementOwner>);

	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const movement = $derived(movementById(data.movement));
	// Presence comes from the selected assembly, not a possibly missing payload.
	const entries = $derived(
		(movement?.entries ?? []).filter((entry) => !entry.onlyWhenPresent || proper.hasSlot(entry.id))
	);
	// Whether this movement has a slot the day fills.
	const hasProper = $derived(
		(movement?.entries ?? []).some(
			(e) => e.kind === 'proper' || isCanonRole(e.id) || e.id === DISMISSAL_ROLE
		)
	);
	const around = $derived(movementNeighbors(data.movement));

	// The flow shares the reading page's help ladder and its stored setting.
	let helpLevel = $state(initialHelp());

	// Parts the reader has opened for themselves this visit. Folding is a
	// default, never a refusal: one tap and the words are there, and they
	// stay there while the reader is on the page.
	let unfolded = $state<Record<string, boolean>>({});
	let citedPart = $state<string | null>(null);
	let citedSegments = $state<string[]>([]);

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
	const selectedBodiesFor = $derived((slot: string) =>
		proper.forSlot(slot).map((part) => ({
			key: part.key,
			slug: part.slug,
			anchor: part.anchor,
			condition: part.condition,
			commemoration: part.commemoration,
			formulary: part.formulary,
			nonfinal: part.nonfinal,
			situation: part.situation,
			doc: part.doc as TextDocument,
			gloss: part.gloss as GlossDocument,
			bibliography: part.bibliography
		}))
	);

	const applicabilityState = $derived({
		date: proper.date,
		mass: proper.day,
		loadedMass: proper.payload?.day ?? null,
		loadedLanguage: proper.payload?.lang ?? null,
		loading: proper.loading,
		failed: proper.failed,
		unwritten: proper.unwritten
	});

	const availableBodiesFor = $derived((e: OrdoEntry) => {
		if (e.kind === 'proper' || isCanonRole(e.id) || e.id === DISMISSAL_ROLE) {
			const chosen = selectedBodiesFor(e.id);
			if (chosen.length) {
				if (e.id === 'epistola' || e.id === 'evangelium')
					return readingPayloadReady(applicabilityState, lang)
						? announcedReadings(e.id, chosen, readingOwners)
						: [];
				return chosen;
			}
			if (proper.variantRequired(e.id)) return [];
		}
		if (e.text) {
			const entry = texts[e.text];
			return entry
				? [
						{
							key: e.text,
							slug: e.text.split('/')[1],
							anchor: textAnchor(e.text),
							condition: undefined,
							commemoration: undefined,
							formulary: undefined,
							nonfinal: undefined,
							situation: undefined,
							...entry
						}
					]
				: [];
		}
		if (e.kind !== 'proper') return [];
		return [];
	});

	const omissionFor = $derived((e: OrdoEntry) => ordinaryOmission(e.id, applicabilityState, lang));
	const bodiesFor = $derived((e: OrdoEntry) => (omissionFor(e) ? [] : availableBodiesFor(e)));

	// Only the matching, settled payload may describe the selected Gospel.
	const settledGospelKeys = $derived(
		!proper.loading &&
			!proper.failed &&
			!proper.unwritten &&
			proper.payload?.day === proper.day &&
			proper.payload?.lang === lang
			? proper.forSlot('evangelium').map((part) => part.key)
			: []
	);

	const entryContext = $derived((entry: OrdoEntry) => {
		const ministerial = ordoMinisterBlessingContext(
			entry.id,
			applicabilityState,
			settledGospelKeys,
			lang
		);
		if (ministerial)
			return {
				...ministerial,
				note: ministerial.note + ' ' + entry.note[lang]
			};
		return (
			ordinaryApplicability(entry.id, applicabilityState, lang) ??
			ordoBlessingContext(entry.id, applicabilityState, lang) ??
			ordoResponseContext(
				entry.id,
				applicabilityState,
				selectedBodiesFor(entry.id === 'deo-gratias-epistolae' ? 'epistola' : 'evangelium'),
				readingOwners,
				proper.payload?.lex,
				lang
			)
		);
	});
	const entryVisibility = $derived((entry: OrdoEntry) =>
		ordoEntryVisibility(
			entryContext(entry)?.referenceOnly ?? false,
			showsWords(
				[...introductionsFor(entry), ...bodiesFor(entry)].flatMap((body) =>
					body.doc.segments
						.filter((segment) => segment.type === 'verse')
						.flatMap((segment) => voicesInMassForm(segment, massForm.value))
				),
				partVoice(entry.id),
				role.value
			),
			!!unfolded[entry.id]
		)
	);
	const silent = $derived(
		entries
			.filter((entry) => bodiesFor(entry).length > 0 && entryVisibility(entry).silent)
			.map((e) => e.id)
	);

	// …and its word panel. A word is one tap from its analysis wherever it
	// stands (decisions #20); the flow is not an exception. Several texts
	// share this page, so a word is addressed by text AND id — `credo.w001`
	// — which is also what the ?w= deep link carries.
	const inlined = $derived(
		entries.flatMap((e) =>
			[...introductionsFor(e), ...bodiesFor(e)].map(({ key, slug, anchor, doc, gloss }) => ({
				slug,
				key,
				anchor,
				doc,
				slot: e.id,
				entry: { doc, gloss }
			}))
		)
	);

	// Where the reader's low/sung choice cannot settle a commemoration (an ordinary one is
	// admitted in a sung conventual Mass and not in one that is not conventual), the three
	// orations' slots show both sequences, each labelled, and no setting chooses between them.
	const variants = $derived(proper.commemorationVariants);
	const commemorated = (e: OrdoEntry) => (COMMEMORATION_SLOTS as readonly string[]).includes(e.id);
	const owesUnavailable = (variant: CommemorationVariant) =>
		variant.unavailable.length > 0 || variant.missing.length > 0;

	const wordsById = $derived(indexOccurrenceWords(inlined));

	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	const locationFrame = readingLocationFrame();
	const cancelLocationFrame = locationFrame.cancel;

	function properMatchesLocation(url: URL) {
		if (proper.date === null || proper.loading || proper.failed) return false;
		if (proper.payload && proper.payload.lang !== lang) return false;
		const date = url.searchParams.get(DAY_PARAM);
		const mass = url.searchParams.get(MASS_PARAM);
		if (date === null && mass === null) return true;
		const requested = date === null ? null : resolveOrdoChoice(date, mass);
		// Invalid choices display the Ordinary alone. A previous loaded proper
		// is not evidence that a citation for the arriving date is stale.
		return requested
			? requested.date === proper.date && requested.mass === proper.day
			: proper.day === null;
	}

	function withoutDayChoice(url: URL) {
		const copy = new URL(url);
		copy.searchParams.delete(DAY_PARAM);
		copy.searchParams.delete(MASS_PARAM);
		return copy.href;
	}

	function applyFromLocation(scroll = true) {
		cancelLocationFrame();
		const url = pageUrl();
		// An absent asynchronous proper is not a stale citation. Keep the
		// address while loading (or after a failed request) so retry can resolve it.
		if (hasProper && !properMatchesLocation(url)) {
			panel.applyFromLocation();
			return;
		}
		const selectedDate = proper.date;
		const selectedMass = proper.day;
		const resolved = resolveCompositeAddress(
			inlined,
			url.searchParams.get('w'),
			url.searchParams.get('s'),
			url.hash
		);
		citedPart = resolved.part;
		citedSegments = resolved.segments;
		const owners = inlined.filter(
			(part) => part.slug === resolved.part || resolved.word?.startsWith(`${part.slug}.`)
		);
		if (owners.length) {
			unfolded = {
				...untrack(() => unfolded),
				...Object.fromEntries(owners.map((part) => [part.slot, true]))
			};
		}
		locationFrame.schedule(() => {
			const current = pageUrl();
			if (withoutDayChoice(current) !== withoutDayChoice(url)) return;
			if (proper.date !== selectedDate || proper.day !== selectedMass) return;
			if (hasProper && !properMatchesLocation(current)) return;
			const original = current.href;
			// The picker can canonicalize the same date in this frame. Merge the
			// citation into that URL, and canonicalize the date here too: either
			// callback order must preserve both changes. Never publish an invalid
			// requested choice as though it had been accepted.
			const date = current.searchParams.get(DAY_PARAM);
			const mass = current.searchParams.get(MASS_PARAM);
			if (
				selectedDate &&
				properMatchesLocation(current) &&
				((date === null && mass === null) || (date && resolveOrdoChoice(date, mass)))
			) {
				writeOrdoChoice(current, { date: selectedDate, mass: selectedMass });
			}
			writeReadingAddress(current, resolved);
			presentReadingLocation(current, original, resolved, () => panel.applyFromLocation(), scroll);
		});
	}

	$effect(() => {
		void wordsById;
		applyFromLocation();
		return cancelLocationFrame;
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
	const pickedDetails = $derived(
		picked && pickedEntry
			? wordPanelSelection(picked.word, pickedEntry.doc, pickedEntry.gloss)
			: null
	);

	keepAwake();

	// The flow is the longest surface in the book and the one a reader
	// leaves and comes back to mid-Mass — it keeps a ribbon like the rest.
	ribbon(
		() => `scrutabor-pos:ordo/${data.movement}`,
		// a deep link into a word outranks the ribbon — that reader asked
		// for a place, the same rule the reading pages follow
		() => {
			const url = pageUrl();
			if (hasProper && !properMatchesLocation(url)) {
				return url.searchParams.has('w') || url.searchParams.has('s');
			}
			const resolved = resolveCompositeAddress(
				inlined,
				url.searchParams.get('w'),
				url.searchParams.get('s'),
				url.hash
			);
			return resolved.word !== null || resolved.segment !== null;
		}
	);
</script>

<svelte:window
	onpopstate={() => applyFromLocation(false)}
	onkeydown={(e) => {
		const href = onWindowKeydown(e);
		if (href) openPage(href);
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
			<div class="tabella">
				<HelpLevels {lang} bind:value={helpLevel} />
				<!-- Keep the dated Mass visible and restore its links even when
				     this movement contains only texts of the Ordinary. -->
				<DayPicker {lang} />
				<RolePicker {lang} />
				<RolePicker {lang} kind="mass" />
			</div>
		</div>
		<FormularyScopeNote {lang} centered />
		{#if movement?.entries.some((e) => isCanonRole(e.id) || e.id === DISMISSAL_ROLE)}
			<noscript
				><p class="noscript-note">
					{lang === 'pl'
						? 'Wybór formuł właściwych dla dnia wymaga JavaScriptu. Bez niego otwórz odpowiednie modlitwy osobno w księdze.'
						: 'Selecting the day’s formulas requires JavaScript. Without it, open the appropriate prayers separately in the book.'}
				</p></noscript
			>
		{/if}
	</header>

	{#if hasProper && proper.loading}
		<span class="sr-only" role="status" aria-live="polite">{msgs.dayLoading}</span>
	{/if}
	<main class:panel-open={picked !== null || panel.keepPad} aria-busy={hasProper && proper.loading}>
		{#each entries as e, idx (e.id)}
			{@const responseContext = entryContext(e)}
			{@const referenceOnly = responseContext?.referenceOnly ?? false}
			{@const context =
				omissionFor(e)?.note ??
				(responseContext
					? responseContext.note
					: ordoContext(e.id, proper.day, proper.paschalDismissal, lang))}
			{@const bodies = bodiesFor(e)}
			{@const entry = bodies[0]}
			{@const headingEntry =
				bodies.find((body) => 'readingReference' in body && body.readingReference) ?? entry}
			<!-- Several bodies in one slot (the Gradual and the Alleluia) are one
			     text to the eye: each learns the row its neighbour renders at
			     their seam, so the seam is priced like any row boundary. -->
			{@const edges = bodies.map((body) => ({
				...textFlowFor(
					body.doc,
					body.gloss,
					{ helpLevel, referenceOnly },
					massForm.value,
					role.value
				),
				// A body that shows its translation sources on screen stays linked to
				// the body after it, and the body after it learns that the block stands
				// between them, so its first margin yields to the block's on screen
				// and prices the seam on paper, where the block is not printed.
				sources: helpLevel >= 2 && body.bibliography.translation.length > 0,
				reference: 'readingReference' in body && !!body.readingReference
			}))}
			{@const openers = introductionsFor(e)}
			{@const openerEdges = openers.map((run) =>
				textFlowFor(run.doc, run.gloss, { helpLevel }, massForm.value, role.value)
			)}
			{@const variantsShown = commemorated(e) && bodies.length > 0 ? variants : []}
			{@const visibility = entryVisibility(e)}
			{@const folded = !!entry && visibility.folded}
			{#if silent.includes(e.id) && !silent.includes(entries[idx - 1]?.id ?? '')}
				<!-- Said once over the run, not on every line of it. -->
				<p class="silent-run smallcaps">{e.quietLabel?.[lang] ?? msgs.quietCollapsed}</p>
			{/if}
			{@const revealed = !!entry && visibility.revealed}
			{@const variantPending = proper.variantRequired(e.id)}
			{@const partLoading =
				(e.kind === 'proper' && proper.loading) ||
				(variantPending && (!proper.date || proper.loading))}
			{@const inline =
				!!entry &&
				!folded &&
				!partLoading &&
				!((variantPending || e.kind === 'proper') && proper.failed)}
			<section
				class="part"
				class:omitted={!!omissionFor(e)}
				class:folded
				class:revealed
				class:loading={partLoading}
			>
				{#snippet partLead()}
					<div class="part-head">
						{#if entry}
							<a class="part-title" href={textHref(lang, (headingEntry ?? entry).key)} lang="la"
								>{e.title}</a
							>
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
							<span class="aside-mark smallcaps">{e.quietLabel?.[lang] ?? msgs.quietAside}</span>
							<button class="refold smallcaps" onclick={() => (unfolded[e.id] = false)}
								>{msgs.quietHide}</button
							>
						{/if}
					</div>
					<!-- The what-happens line rides in EVERY mode, like the rubric
					     narratives it continues (owner, 2026-08-21): the altar's
					     story is the book's own layer, not translation help. -->
					<p class="part-note">
						{#if context}
							{context}
						{:else}
							{e.note[lang]}{#if e.when}<span class="when">{e.when[lang]}</span>{/if}
						{/if}
					</p>
					<!-- RG 480–481: a Secret followed by a commemoration's Secret keeps its
					     words and loses only its audible ending; the mark says so. -->
					{#if entry?.nonfinal && !entry.situation}
						<p class="part-note quiet-note">{msgs.commemorationQuiet}</p>
					{/if}
					{#if variantsShown.some((variant) => variant.described)}
						<p class="part-note variants-note">{msgs.commemorationVariants}</p>
					{:else if variantsShown.some(owesUnavailable)}
						<p class="part-note unavailable-note">{msgs.commemorationUnavailable}</p>
					{/if}
				{/snippet}
				<!-- The greeting, its answer and Orémus open the part whether or not the day
				     supplies its text: the Easter Vigil's Offertory has no antiphon and keeps
				     them. They are the owner texts' own words, delivered as each occurrence of
				     the corpus resource says, in both forms of Mass, and they share the part's
				     opening text so that their seam with the day's text is priced like any
				     seam between two bodies of a slot. -->
				{#snippet introduction(next: FlowRow | undefined)}
					{#each openers as run, k (run.slug)}
						<TextBody
							doc={run.doc}
							gloss={run.gloss}
							{lang}
							{helpLevel}
							idPrefix={run.slug}
							selectedId={panel.id}
							citedSegments={citedPart === run.slug ? citedSegments : []}
							ontap={tapWord}
							onmark={openLegend}
							preceding={openerEdges[k - 1]?.last}
							following={k === openers.length - 1 ? next : openerEdges[k + 1]?.first}
						/>
					{/each}
				{/snippet}
				<!-- One of the two described sung sequences begins: its label, what it lacks,
				     and the quiet ending of a Secret that is not the last in it. -->
				{#snippet variantHead(body: VariantBody)}
					{#if body.situation}
						<p class="variant-head smallcaps">{msgs.commemorationSituations[body.situation]}</p>
						{#if variantsShown.some((variant) => variant.situation === body.situation && owesUnavailable(variant))}
							<p class="part-note unavailable-note">{msgs.commemorationUnavailable}</p>
						{/if}
						{#if body.nonfinal}
							<p class="part-note quiet-note">{msgs.commemorationQuiet}</p>
						{/if}
					{/if}
				{/snippet}
				{#snippet partLayout(
					opening: Snippet,
					continuation: Snippet,
					hasContinuation: boolean,
					compactOpening: boolean
				)}
					<div class="print-opening" class:compact={compactOpening}>
						{@render partLead()}
						<div class="part-text">
							{@render introduction(edges[0]?.first)}
							{@render variantHead(entry)}
							{#if entry.condition && !proper.date}
								<ComponentConditionNote condition={entry.condition} {lang} />
							{/if}
							{@render opening()}
						</div>
					</div>
					{#if hasContinuation || bodies.length > 1}
						<div class="part-text part-continuation">
							{@render continuation()}
							{#each bodies.slice(1) as body, j (body.slug)}
								{#if body.situation && body.situation !== bodies[j].situation}
									{@render variantHead(body)}
								{:else if body.nonfinal}
									<p class="part-note quiet-note">{msgs.commemorationQuiet}</p>
								{/if}
								{#if body.commemoration}
									<!-- The commemoration's oration follows the Mass oration it answers
									     to, under its own conclusion (RG 436–437). -->
									<p class="commemoration-head">
										<a
											class="part-title"
											href={commemorationEntryHref(lang, {
												key: body.key,
												slot: e.id,
												commemoration: body.commemoration,
												formulary: body.formulary
											})}
											lang="la">{e.title}</a
										>
										<span class="mark smallcaps"
											>{msgs.ordoCommemoration}: {commemorationName(
												body.commemoration,
												body.formulary,
												lang
											)}</span
										>
									</p>
								{/if}
								{#if body.condition && !proper.date}
									<ComponentConditionNote condition={body.condition} {lang} />
								{/if}
								{#if 'readingReference' in body && body.readingReference}
									<p class="reading-reference" data-reading={body.slug} lang="la">
										{body.readingReference}{#if 'referenceUncertain' in body && body.referenceUncertain}<span
												{lang}
												>{lang === 'pl'
													? ' (odczyt ze skanu niepewny, czytanie: '
													: ' (scan reading uncertain, passage: '}{'readingPericope' in body
													? body.readingPericope
													: ''})</span
											>{:else if 'referenceMisprint' in body && body.referenceMisprint}<span {lang}
												>{lang === 'pl'
													? ' (jak w druku, czytanie: '
													: ' (as printed, passage: '}{'readingPericope' in body
													? body.readingPericope
													: ''})</span
											>{/if}
									</p>
								{/if}
								<TextBody
									doc={body.doc}
									{referenceOnly}
									gloss={body.gloss}
									{lang}
									{helpLevel}
									idPrefix={body.slug}
									selectedId={panel.id}
									citedSegments={citedPart === body.slug ? citedSegments : []}
									ontap={tapWord}
									onmark={openLegend}
									verifiedTranslationCitations={body.bibliography.translation}
									preceding={edges[j].last}
									precededBySources={edges[j].sources}
									referenceEdges={{
										before: edges[j + 1].reference,
										after: edges[j + 2]?.reference
									}}
									following={edges[j + 2]?.first}
								/>
							{/each}
						</div>
					{/if}
				{/snippet}
				{#if folded}
					<!-- A prayer the reader is not saying costs ONE LINE, not a
					     card: title, what is happening, and the way in. Twelve of
					     these stand between the Sanctus and the Amen a person in
					     the pew answers, and at a card apiece they were most of
					     the page — the reader scrolls past the silence looking
					     for their own next line. Folded, never hidden. -->
					<button class="unfold" onclick={() => (unfolded[e.id] = true)}>
						<span class="unfold-title" lang="la">{e.title}</span>
						<span class="unfold-what">{context ?? e.note[lang]}</span>
						<span class="unfold-do smallcaps">{msgs.quietReveal}</span>
					</button>
				{:else if !inline}
					{@render partLead()}
					{#if openers.length}
						<div class="part-text">{@render introduction(undefined)}</div>
					{/if}
				{/if}
				{#if partLoading}
					<div class="part-loading">
						<ContentLoader variant="text" />
					</div>
				{:else if (variantPending || e.kind === 'proper') && proper.failed}
					<p class="part-note" role="status">{msgs.dayFailed}</p>
				{:else if inline && entry}
					{#key entry.slug}
						<TextBody
							doc={entry.doc}
							{referenceOnly}
							gloss={entry.gloss}
							{lang}
							{helpLevel}
							idPrefix={entry.slug}
							selectedId={panel.id}
							citedSegments={citedPart === entry.slug ? citedSegments : []}
							ontap={tapWord}
							onmark={openLegend}
							verifiedTranslationCitations={entry.bibliography.translation}
							layout={partLayout}
							preceding={openerEdges.at(-1)?.last}
							following={edges[1]?.first}
							referenceEdges={{ after: edges[1]?.reference }}
						/>
					{/key}
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

	<SelectedWordPanel
		word={picked?.word ?? null}
		details={pickedDetails}
		lex={mergedLex}
		{lang}
		onclose={panel.close}
		onnavigate={panel.goTo}
		idPrefix={picked?.slug ?? ''}
	/>
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

	/* A commemoration's oration opens like a part of its own inside the slot:
	   the same title, and the mark that names whose oration it is. */
	.commemoration-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.2rem 1rem;
		margin: 1.4rem 0 0;
		padding-top: 0.8rem;
		border-top: 1px dotted var(--border);
	}

	.quiet-note {
		font-style: italic;
	}

	/* A described sung sequence opens under its own label, the quiet mark the book's other
	   labels use, so the two alternatives read as two and never as one sequence. */
	.variant-head {
		margin: 1.4rem 0 0;
		padding-top: 0.8rem;
		border-top: 1px dotted var(--border);
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		color: var(--rubric);
	}

	/* The condition is a footnote to the part, not a clause of its
	   description — the note prose already carries dashes of its own. */
	.when {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.9rem;
	}

	.part-text {
		/* the seam's own ruler: exactly a rubric's top margin, so the note
		   above stands equally far from the text in EVERY mode — in flow
		   the first rubric's margin collapses up to this same number, and
		   in the bilingual grid (which collapses nothing) the edge children
		   defer to it (TextBody zeroes the grid's first top margin) */
		margin-top: calc(var(--reading) * (1 + var(--gloss-gap)));
	}

	.part-loading {
		min-height: 4.3rem;
		margin-top: calc(var(--reading) * (1 + var(--gloss-gap)));
	}

	/* room for the sheet, so even the last word can rise clear of it */
	main.panel-open {
		padding-bottom: 45vh;
	}

	/* The opening frame has no screen box. Text continuation keeps the
	   same per-part text seam; only paper gains the bounded association. */
	.print-opening {
		display: contents;
	}
	.part-text.part-continuation {
		margin-top: 0;
	}

	@media print {
		.print-opening {
			display: block;
			break-inside: auto;
		}
		.print-opening.compact {
			break-inside: avoid;
		}
		/* Rubric-only fallbacks connect onward; real source openings already
		   share this frame with the complete title and guidance. */
		.print-opening:not(:has(.verse)) {
			break-after: avoid;
		}

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
			container: print-part / inline-size;
			margin: 0 0 11pt;
			padding-top: 7pt;
			break-inside: auto;
		}

		/* Revealed-aside decoration belongs to interactive reading. On paper
		   every part shares the same measure as its bilingual text. */
		.part.revealed .part-text {
			border-inline-start: 0;
			padding-inline-start: 0;
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
			break-inside: avoid;
			font-size: 0.75rem;
			line-height: 1.35;
		}

		.part-text {
			margin-top: 6pt;
		}
	}

	/* Match TextFlow's actual grid measure, not the paper or viewport.
	   A stacked long first row must remain fragmentable; a grid opening
	   needs the outer keep to carry its lead across containment. */
	@container print-part (min-width: 44rem) {
		@media print {
			.part .print-opening:has(:global(.bilingual)) {
				break-inside: avoid;
			}
		}
	}
	.reading-reference {
		margin: calc(var(--reading) * 0.55) 0 calc(var(--reading) * 0.35);
		break-after: avoid;
	}
</style>

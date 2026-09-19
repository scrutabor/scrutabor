<script lang="ts">
	import type { TextBibliographyEvidence } from '$lib/bibliography';
	import { arrowNav } from '$lib/arrow-nav';
	import AboutSheet from '$lib/components/AboutSheet.svelte';
	import ComponentConditionNote from '$lib/components/ComponentConditionNote.svelte';
	import type { ComponentCondition } from '$lib/corpus-metadata';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import { initialHelp } from '$lib/components/HelpLevels.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import ReadingControls from '$lib/components/ReadingControls.svelte';
	import SelectedWordPanel from '$lib/components/SelectedWordPanel.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { openPage } from '$lib/page-navigation';
	import type { ProperPart } from '$lib/proprium';
	import { offersMassFormChoice, offersRoleChoice } from '$lib/reading-settings';
	import { formatSegmentSelection, segmentRange } from '$lib/segment-selection';
	import { resolveCompositeAddress, writeReadingAddress } from '$lib/reading-address';
	import { presentReadingLocation, readingLocationFrame } from '$lib/reading-location';
	import { indexOccurrenceWords, properOccurrences } from '$lib/proper-occurrences';
	import { pageUrl } from '$lib/url';
	import { replaceState } from '$app/navigation';
	import { wordPanel, wordPanelSelection } from '$lib/wordpanel.svelte';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const day = $derived(data);
	const parts = $derived(
		data.parts as {
			key: string;
			part: ProperPart;
			condition?: ComponentCondition;
			doc: TextDocument;
			gloss: GlossDocument;
			bibliography: TextBibliographyEvidence;
		}[]
	);
	const around = $derived(data.around);
	const partTitles: Record<ProperPart, string> = {
		introitus: 'Intróitus',
		collecta: 'Orátio',
		epistola: 'Epístola',
		graduale: 'Graduále',
		alleluia: 'Allelúia',
		tractus: 'Tractus',
		sequentia: 'Sequéntia',
		evangelium: 'Evangélium',
		offertorium: 'Offertórium',
		secreta: 'Secréta',
		praefatio: 'Præfátio',
		communio: 'Commúnio',
		postcommunio: 'Postcommúnio'
	};

	let helpLevel = $state(initialHelp());
	let legendOpen = $state(false);
	let aboutKey = $state<string | null>(null);
	// One part's cited lines, exactly as a reading page keeps them: the part
	// the address names, the verses selected within it, and the anchor a
	// Shift-extended range grows from. A citation never spans two parts.
	let citedPart = $state<string | null>(null);
	let citedSegments = $state<string[]>([]);
	let segmentAnchor = $state<string | null>(null);
	const hasRoleChoice = $derived(parts.some((part) => offersRoleChoice(part.doc.segments)));
	const hasMassFormChoice = $derived(parts.some((part) => offersMassFormChoice(part.doc.segments)));

	const inlined = $derived(properOccurrences(parts));
	const aboutPart = $derived(inlined.find((part) => part.slug === aboutKey) ?? null);
	const wordsById = $derived(indexOccurrenceWords(inlined));
	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	// A search result or a shared link names one line of one part. The line
	// is marked AND brought into view, as a reading page brings its cited
	// verse: a Passion runs to a hundred segments, and a link that only
	// scrolled to the Gospel's heading left the cited words ten screens down.
	// The address is canonicalized in place, as on a reading page, so a
	// selector naming nothing cannot linger.
	const locationFrame = readingLocationFrame();
	const cancelLocationFrame = locationFrame.cancel;

	function applyFromLocation(scroll = true) {
		cancelLocationFrame();
		const url = pageUrl();
		const original = url.href;
		const resolved = resolveCompositeAddress(
			inlined,
			url.searchParams.get('w'),
			url.searchParams.get('s'),
			url.hash
		);
		writeReadingAddress(url, resolved);
		citedPart = resolved.part;
		citedSegments = resolved.segments;
		segmentAnchor = resolved.segments[0] ?? null;
		// The router cannot replace history during its hydration flush. A
		// deferred update belongs only to this address, never a later navigation
		// or a reader's intervening selection.
		locationFrame.schedule(() => {
			if (pageUrl().href !== original) return;
			presentReadingLocation(url, original, resolved, () => panel.applyFromLocation(), scroll);
		});
	}

	$effect(() => {
		void wordsById;
		applyFromLocation();
		return cancelLocationFrame;
	});

	function writeSegmentSelection(slug: string, selected: string[], ids: string[]) {
		const url = pageUrl();
		const value = formatSegmentSelection(selected, ids);
		if (value) url.searchParams.set('s', `${slug}.${value}`);
		else url.searchParams.delete('s');
		replaceState(url, {});
	}

	function selectSegment(slug: string, id: string, extend: boolean) {
		// A verse tap under an open panel both selects and dismisses; the
		// selection is written once the panel's own history entry is gone.
		panel.closeThen(() => applySelection(slug, id, extend));
	}

	function applySelection(slug: string, id: string, extend: boolean) {
		const part = inlined.find((candidate) => candidate.slug === slug);
		if (!part) return;
		const ids = part.doc.segments.map((segment) => segment.id);
		if (extend && segmentAnchor && citedPart === slug) {
			citedSegments = segmentRange(ids, segmentAnchor, id);
		} else if (citedPart === slug && citedSegments.length === 1 && citedSegments[0] === id) {
			citedSegments = [];
			segmentAnchor = null;
		} else {
			citedSegments = [id];
			segmentAnchor = id;
		}
		citedPart = citedSegments.length ? slug : null;
		writeSegmentSelection(slug, citedSegments, ids);
	}

	const picked = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	const pickedDetails = $derived(
		picked ? wordPanelSelection(picked.word, picked.doc, picked.gloss) : null
	);

	function citedFor(slug: string): string[] {
		return citedPart === slug ? citedSegments : [];
	}

	function tapWord(id: string) {
		aboutKey = null;
		legendOpen = false;
		panel.toggle(id);
	}

	function openLegend() {
		aboutKey = null;
		panel.close();
		legendOpen = true;
	}

	function openAbout(key: string) {
		legendOpen = false;
		panel.close();
		aboutKey = key;
	}

	const onWindowKeydown = arrowNav((direction) => {
		const target = direction === 'prev' ? around.prev : around.next;
		return target ? `/app/${lang}/formularium/${target.id}` : undefined;
	});

	keepAwake();
</script>

<svelte:window
	onpopstate={() => {
		// History still restores which line is cited, but it is not a fresh
		// arrival at that citation: closing a word panel pops its shallow
		// entry and must leave the reader exactly where they are.
		applyFromLocation(false);
	}}
	onkeydown={(event) => {
		const href = onWindowKeydown(event);
		if (href) openPage(href);
	}}
/>

<svelte:head>
	<title>{day ? `${day.title.la} — Scrutabor` : 'Scrutabor'}</title>
	{#if day}
		<meta
			name="description"
			content={msgs.readingDescription.replace('{title}', day.title[lang])}
		/>
	{/if}
</svelte:head>

<div class="page reading">
	<header>
		<PageNav {lang} parent="/app/{lang}/formularium" parentLabel={msgs.dayPicker.catalogTitle} />
		<h1 lang="la">{day?.title.la ?? ''}</h1>
		{#if day?.title[lang] !== day?.title.la}
			<p class="subtitle">{day?.title[lang]}</p>
		{/if}
		<ReadingControls {lang} bind:value={helpLevel} {hasRoleChoice} {hasMassFormChoice} />
		{#if day.partial}<p class="partial smallcaps">{msgs.dayPartial}</p>{/if}
	</header>

	<main class:panel-open={picked !== null || panel.keepPad}>
		{#each inlined as part (part.slug)}
			<section class="proper-part" id={part.anchor}>
				<div class="part-heading">
					<div>
						<h2 lang="la">{partTitles[part.part]}</h2>
						<p lang="la">{part.doc.title}</p>
					</div>
					{#if part.gloss.about || part.bibliography.context.length}
						<button class="about-pill smallcaps" onclick={() => openAbout(part.slug)}
							>{msgs.aboutLabel}</button
						>
					{/if}
				</div>
				{#if part.condition}
					<ComponentConditionNote condition={part.condition} {lang} />
				{/if}
				<TextBody
					doc={part.doc}
					gloss={part.gloss}
					{lang}
					{helpLevel}
					idPrefix={part.slug}
					selectedId={panel.id}
					ontap={tapWord}
					onmark={openLegend}
					citedSegments={citedFor(part.slug)}
					onsegmentselect={(id, extend) => selectSegment(part.slug, id, extend)}
					verifiedTranslationCitations={part.bibliography.translation}
				/>
			</section>
		{/each}

		<Pager
			{lang}
			prev={around.prev && {
				href: `/app/${lang}/formularium/${around.prev.id}`,
				title: around.prev.title[lang]
			}}
			next={around.next && {
				href: `/app/${lang}/formularium/${around.next.id}`,
				title: around.next.title[lang]
			}}
		/>
	</main>

	{#if legendOpen}<MarkLegend {lang} onclose={() => (legendOpen = false)} />{/if}
	{#if aboutPart}
		<AboutSheet
			{lang}
			about={aboutPart.gloss.about}
			citations={aboutPart.bibliography.context}
			onclose={() => (aboutKey = null)}
		/>
	{/if}
	<SelectedWordPanel
		word={picked?.word ?? null}
		details={pickedDetails}
		lex={data.lex}
		{lang}
		onclose={panel.close}
		onnavigate={panel.goTo}
		idPrefix={picked?.slug ?? ''}
	/>
</div>

<style>
	.page > header {
		padding-bottom: 1.3rem;
	}

	.partial {
		margin: 1rem auto 0;
		width: fit-content;
		color: var(--ink-soft);
		font-size: 0.72rem;
	}

	main.panel-open {
		padding-bottom: 45vh;
	}

	.proper-part {
		scroll-margin-top: 1rem;
		margin: 0 0 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.part-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.8rem 1rem;
		margin-bottom: 1.2rem;
	}

	.part-heading h2,
	.part-heading p {
		margin: 0;
	}

	.part-heading h2 {
		font-size: 1.45rem;
		font-weight: 500;
	}

	.part-heading p {
		margin-top: 0.2rem;
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.about-pill {
		flex: none;
		font: inherit;
		cursor: pointer;
		font-size: 0.7rem;
		color: var(--ink-soft);
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.22rem 0.72rem;
	}

	.about-pill:hover {
		color: var(--ink);
		background: var(--wash);
	}

	@media (max-width: 36rem) {
		.part-heading {
			display: block;
		}

		.about-pill {
			margin-top: 0.7rem;
		}
	}

	@media print {
		.page > header {
			padding-bottom: 9pt;
		}

		main.panel-open {
			padding-bottom: 0;
		}

		.proper-part {
			break-before: auto;
			margin-bottom: 18pt;
			padding-top: 9pt;
		}

		.part-heading {
			break-after: avoid-page;
		}

		.about-pill {
			display: none;
		}
	}
</style>

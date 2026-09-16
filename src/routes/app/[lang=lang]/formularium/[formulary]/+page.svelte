<script lang="ts">
	import type { TextBibliographyEvidence } from '$lib/bibliography';
	import { arrowNav } from '$lib/arrow-nav';
	import AboutSheet from '$lib/components/AboutSheet.svelte';
	import MarkLegend from '$lib/components/MarkLegend.svelte';
	import { initialHelp } from '$lib/components/HelpLevels.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import ReadingControls from '$lib/components/ReadingControls.svelte';
	import SelectedWordPanel from '$lib/components/SelectedWordPanel.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import type { GlossDocument, TextDocument, Word } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { keepAwake } from '$lib/keepawake.svelte';
	import { openPage } from '$lib/page-navigation';
	import type { ProperPart } from '$lib/proprium';
	import { offersMassFormChoice, offersRoleChoice } from '$lib/reading-settings';
	import { textAnchor } from '$lib/text-anchor';
	import { pageUrl } from '$lib/url';
	import { wordPanel } from '$lib/wordpanel.svelte';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const day = $derived(data);
	const parts = $derived(
		data.parts as {
			key: string;
			part: ProperPart;
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
	let citedSegment = $state('');
	const hasRoleChoice = $derived(parts.some((part) => offersRoleChoice(part.doc.segments)));
	const hasMassFormChoice = $derived(parts.some((part) => offersMassFormChoice(part.doc.segments)));

	const inlined = $derived(parts.map((part) => ({ ...part, slug: part.key.split('/')[1] })));
	const aboutPart = $derived(inlined.find((part) => part.key === aboutKey) ?? null);
	const wordsById = $derived(
		new Map<string, { word: Word; doc: TextDocument; slug: string; gloss: GlossDocument }>(
			inlined.flatMap((part) =>
				part.doc.segments.flatMap((segment) =>
					(segment.words ?? []).map((word) => [
						`${part.slug}.${word.id}`,
						{ word, doc: part.doc, slug: part.slug, gloss: part.gloss }
					])
				)
			)
		)
	);
	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	function applyFromLocation() {
		panel.applyFromLocation();
		citedSegment = pageUrl().searchParams.get('s') ?? '';
	}

	$effect(() => {
		void wordsById;
		applyFromLocation();
	});

	const picked = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	const pickedGloss = $derived(picked ? (picked.gloss.words[picked.word.id] ?? null) : null);
	const pickedAnalysis = $derived(
		picked
			? (picked.word.analysis ?? picked.doc.analysis_defaults_words ?? picked.doc.analysis_defaults)
			: null
	);

	function citedFor(slug: string): string[] {
		const prefix = `${slug}.`;
		return citedSegment.startsWith(prefix) ? [citedSegment.slice(prefix.length)] : [];
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
	onpopstate={applyFromLocation}
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
		<PageNav {lang} parent="/app/{lang}/ordo" parentLabel="Ordo Missæ" parentLang="la" />
		<h1 lang="la">{day?.title.la ?? ''}</h1>
		{#if day?.title[lang] !== day?.title.la}
			<p class="subtitle">{day?.title[lang]}</p>
		{/if}
		<ReadingControls {lang} bind:value={helpLevel} {hasRoleChoice} {hasMassFormChoice} />
		{#if day.partial}<p class="partial smallcaps">{msgs.dayPartial}</p>{/if}
	</header>

	<main class:panel-open={picked !== null || panel.keepPad}>
		{#each inlined as part (part.key)}
			<section class="proper-part" id={textAnchor(part.key)}>
				<div class="part-heading">
					<div>
						<h2 lang="la">{partTitles[part.part]}</h2>
						<p lang="la">{part.doc.title}</p>
					</div>
					{#if part.gloss.about || part.bibliography.context.length}
						<button class="about-pill smallcaps" onclick={() => openAbout(part.key)}
							>{msgs.aboutLabel}</button
						>
					{/if}
				</div>
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
		gloss={pickedGloss}
		analysis={pickedAnalysis}
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

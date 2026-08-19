<script lang="ts">
	// The landing: what Scrutabor is, shown before it is told. One page
	// per language, in the book's own face and voice. The specimen is the
	// book itself for one verse — verse 34 of Psalm 118, the motto's own,
	// straight from the corpus (see +page.server.ts) with the app's real
	// slider and the app's real word panel, fully alive.
	import { goto } from '$app/navigation';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import WordPanel from '$lib/components/WordPanel.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);

	const doc = $derived(data.specimen.doc);
	const gloss = $derived(data.specimen.gloss);

	// The same three verbosity states as every reading page; the slider
	// itself restores the reader's stored choice on mount.
	let helpLevel = $state(1);

	// The specimen's analysis lives in a box that is ALWAYS open — its
	// whole purpose is to be looked at, so there is nothing to close and
	// no history to keep: a tap only chooses which word it explains. It
	// opens on scrutábor, the word the app is named after (word ids are
	// forever — decisions #3).
	let selected = $state('w016');

	const wordsOf = $derived(
		new Map((doc?.segments ?? []).flatMap((s) => (s.words ?? []).map((w) => [w.id, w] as const)))
	);
	const selWord = $derived(wordsOf.get(selected) ?? doc.segments[0]?.words?.[0] ?? null);
	const selGloss = $derived(selWord ? (gloss.words[selWord.id] ?? null) : null);
	const selAnalysis = $derived(
		selWord ? (selWord.analysis ?? doc.analysis_defaults_words ?? doc.analysis_defaults) : null
	);

	interface Copy {
		title: string;
		description: string;
		open: string;
		openNote: string;
		zipTitle: string;
		zipNote: string;
		soonNote: string;
		specimenLead: string;
		stanzaLink: string;
		privacyLine: string;
		privacyLink: string;
		supportLink: string;
		editioLink: string;
		bibliographyLink: string;
		sourcesLink: string;
	}

	// The channels still coming: named now and greyed until they ship, so
	// the row of doors is born with its final shape.
	const SOON = [
		{ name: 'Google Play', icon: 'play' },
		{ name: 'App Store', icon: 'apple' },
		{ name: 'F-Droid', icon: 'fdroid' }
	];

	const T: Record<Lang, Copy> = {
		pl: bindProse({
			title: 'Scrutabor — modlitwa po łacinie ze zrozumieniem',
			description:
				'Darmowy łaciński modlitewnik z analizą słowo po słowie: przekład, gramatyka i wymowa każdego słowa. Ordo Missæ z 1962 roku i modlitwy, także do pobrania.',
			open: 'Otwórz modlitewnik',
			openNote: 'w przeglądarce, bez instalacji',
			zipTitle: 'Plik ZIP',
			zipNote: 'kopia do pobrania',
			soonNote: 'wkrótce',
			specimenLead:
				'Werset, od którego Scrutabor bierze nazwę, w postaci, jaką ma w modlitewniku: suwak pomocy prowadzi od samej łaciny do pełnego przekładu, a dotknięcie słowa otwiera jego analizę.',
			stanzaLink: 'Psalm\u00a0118, He — w.\u00a034',
			privacyLine: 'Bez rejestracji, bez plików cookie, bez reklam.',
			privacyLink: 'prywatność',
			supportLink: 'pomoc',
			editioLink: 'jak powstaje to wydanie',
			bibliographyLink: 'bibliografia',
			sourcesLink: 'źródła na GitHubie'
		}),
		en: {
			title: 'Scrutabor — prayer in Latin, with understanding',
			description:
				'A free Latin prayer book with word-by-word analysis: translation, grammar, and pronunciation for every word. The 1962 Ordo Missæ and common prayers, downloadable too.',
			open: 'Open the prayer book',
			openNote: 'in the browser, no installation',
			zipTitle: 'ZIP file',
			zipNote: 'a copy to keep',
			soonNote: 'coming soon',
			specimenLead:
				'The verse Scrutabor takes its name from, exactly as it stands in the prayer book: the help slider moves from bare Latin to a full translation, and a tap on any word opens its analysis.',
			stanzaLink: 'Psalm\u00a0118, He — v.\u00a034',
			privacyLine: 'No registration, no cookies, no ads.',
			privacyLink: 'privacy',
			supportLink: 'support',
			editioLink: 'how this edition is made',
			bibliographyLink: 'bibliography',
			sourcesLink: 'source on GitHub'
		}
	};

	const t = $derived(T[lang]);

	// The versioned release asset, resolved by the server load — see
	// +page.server.ts for why the landing can link an exact version.
	const ZIP = $derived(data.zip);
</script>

{#snippet doorIcon(name: string)}
	<!-- Hand-drawn, monochrome, currentColor: the doors keep the page's
	     ink in both themes, and nothing is fetched from anywhere. The
	     store marks are referential (named beside them); the official
	     colour badges have their own asset rules and can take a tile's
	     place when a channel actually ships. -->
	{#if name === 'book'}
		<svg
			class="way-icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M2.5 5.2C5.4 3.8 8.8 3.9 12 5.8c3.2-1.9 6.6-2 9.5-.6v13.4c-2.9-1.4-6.3-1.3-9.5.6-3.2-1.9-6.6-2-9.5-.6Z"
			/>
			<path d="M12 5.8v13.4" />
		</svg>
	{:else if name === 'phone'}
		<svg
			class="way-icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
			<path d="M10.5 18.5h3" />
		</svg>
	{:else if name === 'download'}
		<svg
			class="way-icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 3.5v9.5m0 0-3.8-3.8M12 13l3.8-3.8" />
			<path d="M4.5 16.5v2.8a1.2 1.2 0 0 0 1.2 1.2h12.6a1.2 1.2 0 0 0 1.2-1.2v-2.8" />
		</svg>
	{:else if name === 'play'}
		<svg class="way-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
			<path
				d="M5 3.6v16.8c0 .5.55.8.97.53l13.2-8.4a.62.62 0 0 0 0-1.06L5.97 3.07A.62.62 0 0 0 5 3.6Z"
			/>
		</svg>
	{:else if name === 'apple'}
		<svg class="way-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
			<path
				d="M16.2 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.85-1.4-.15-2.8.85-3.5.85-.7 0-1.85-.83-3-.8-1.55.02-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.77 1.1 1.7 2.4 2.9 2.35 1.17-.05 1.6-.76 3-.76 1.4 0 1.8.76 3 .73 1.25-.02 2.05-1.13 2.8-2.25.9-1.3 1.26-2.55 1.28-2.6-.03-.02-2.45-.95-2.48-3.77Z"
			/>
			<path
				d="M14.4 5.5c.64-.78 1.07-1.86.95-2.94-.92.04-2.04.62-2.7 1.4-.6.68-1.12 1.78-.98 2.83 1.03.08 2.08-.52 2.73-1.3Z"
			/>
		</svg>
	{:else if name === 'fdroid'}
		<svg
			class="way-icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M7 3.5 9 6m8-2.5L15 6" />
			<rect x="4.5" y="6" width="15" height="9.5" rx="3" />
			<circle cx="9.3" cy="10.7" r="0.5" fill="currentColor" />
			<circle cx="14.7" cy="10.7" r="0.5" fill="currentColor" />
			<path d="M8 19.5h8" />
		</svg>
	{/if}
{/snippet}

<svelte:head>
	<title>{t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<div class="page centered landing">
	<SurfaceNav {lang} base="" />
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="tagline">{M[lang].tagline}</p>

		<!-- Every way into the book, in one row: the web first, because it
		     is ready the moment it is tapped; the store channels named and
		     greyed until they ship, so the row is born with its final
		     shape. The motto is not repeated here — the specimen below IS
		     the motto, demonstrating the book instead of describing it. -->
		<div class="ways">
			<a class="way primary" href="/app/{lang}">
				{@render doorIcon('book')}
				<span class="way-title">{t.open}</span>
				<span class="way-note">{t.openNote}</span>
			</a>
			<a class="way" href={ZIP} rel="external">
				{@render doorIcon('download')}
				<span class="way-title">{t.zipTitle}</span>
				<span class="way-note">{t.zipNote}</span>
				<span class="way-version">v{data.version}</span>
			</a>
			{#each SOON as channel (channel.name)}
				<div class="way soon">
					{@render doorIcon(channel.icon)}
					<span class="way-title">{channel.name}</span>
					<span class="way-note">{t.soonNote}</span>
				</div>
			{/each}
		</div>

		<section class="specimen-section">
			<p class="lead">{t.specimenLead}</p>

			<!-- The book itself, for one verse: the real slider, corpus text
			     and WordPanel. The panel changes only its placement here: it
			     stands permanently in the page instead of covering it. -->
			<div class="specimen">
				<div class="specimen-help">
					<HelpLevels {lang} bind:value={helpLevel} />
				</div>
				<p class="stanza-link smallcaps">
					<a href="/app/{lang}/psalmi/118-he?v=34">{t.stanzaLink}</a>
				</p>
				<TextBody
					{doc}
					{gloss}
					{lang}
					{helpLevel}
					selectedId={selected}
					ontap={(id) => (selected = id)}
				/>
				{#if selWord && selAnalysis}
					<WordPanel
						word={selWord}
						gloss={selGloss}
						analysis={selAnalysis}
						lex={data.specimen.lex}
						{lang}
						inline
						onnavigate={(id) => {
							// A note may cite a word from another verse of the
							// stanza (custódiam cites exquíram); the specimen
							// carries only its own verse, so such a reference
							// opens the real page at the cited word instead of
							// silently re-aiming the panel at the fallback.
							if (wordsOf.has(id)) selected = id;
							else goto(`/app/${lang}/psalmi/118-he?w=${id}`);
						}}
					/>
				{/if}
			</div>
		</section>

		<footer>
			<p class="privacy-line">{t.privacyLine}</p>
			<p class="foot-links">
				<a href="/{lang}/privacy">{t.privacyLink}</a>
				· <a href="/{lang}/support">{t.supportLink}</a>
				· <a href="/app/{lang}/editio">{t.editioLink}</a>
				· <a href="/app/{lang}/bibliographia">{t.bibliographyLink}</a>
				· <a href="https://github.com/scrutabor" rel="external">{t.sourcesLink}</a>
			</p>
		</footer>
	</main>
</div>

<style>
	/* The nav row, .tagline, .motto and .motto-ref are shared furniture
	   (app.css): the same objects on the catalog and the routers. */

	/* Every door in one row: the web door loud (rubric, with its label in
	   the page background colour — the pair axe checks), the ready doors
	   quiet, and the channels still coming standing in the same row so
	   the layout is already the one they will ship into. */
	/* A GRID, not a wrap: the first thing a new visitor sees has to be
	   set like a title page, and equal tracks are what make five boxes
	   read as one designed object. The web door is a full-width bar; the
	   four beneath share one row of equal columns, two by two on a
	   phone. */
	.ways {
		margin: 2.6rem 0 0;
		display: grid;
		/* One row of plates, the web door half again as wide: its primacy
		   is width and red INK, not red mass — a slab of rubric outweighed
		   the wordmark itself, and nothing in the book uses red as mass;
		   a missal's red is always ink. */
		grid-template-columns: 1.6fr repeat(4, 1fr);
		gap: 0.7rem;
		width: 100%;
		max-width: 46rem;
	}

	@media (max-width: 40rem) {
		.ways {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.way {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* FROM THE TOP, not from the middle. The tiles are all one height,
		   but their contents were centred inside it — so the download tile,
		   which carries a fourth line naming the edition, pushed its own
		   icon and title nine pixels above every other tile's. The boxes
		   lined up and nothing inside them did, which is the misalignment
		   the owner saw (2026-08-07). Aligned to the top, the icons share a
		   line, the names share a line, and the version simply hangs below
		   its own. */
		justify-content: flex-start;
		gap: 0.1rem;
		padding: 0.7rem 0.9rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		text-decoration: none;
		text-align: center;
	}

	a.way:hover {
		background: var(--wash);
	}

	a.way:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}

	.way .way-icon {
		width: 1.45rem;
		height: 1.45rem;
		margin-bottom: 0.3rem;
		opacity: 0.9;
	}

	.way.soon .way-icon {
		color: var(--ink-soft);
	}

	.way-title {
		font-size: 1.05rem;
	}

	.way-note {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}

	.way-version {
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.way.primary .way-note {
		font-size: 0.85rem;
	}

	/* The web door: rubric as INK, not as mass — red border, red title,
	   red book mark on the page's own paper (colour on the tile, so the
	   icon's currentColor drinks it too). It leads by width and by being
	   the only red-inked plate, the way a rubric leads on a missal page,
	   and the wordmark keeps the room. */
	.way.primary {
		border-color: var(--rubric);
		color: var(--rubric);
	}

	@media (max-width: 40rem) {
		.way.primary {
			grid-column: 1 / -1;
		}
	}

	.way.primary .way-title {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--rubric);
	}

	a.way.primary:hover {
		background: var(--wash);
	}

	/* Not ready yet: named, and unmistakably inert — unfilled, its frame
	   dashed like a plate reserved on the page, and not a link, because a
	   door that opens nothing must not invite the hand. */
	/* THE THREE THAT ARE NOT DOORS YET. A border and a surface are what
	   say "press me", so the announced channels have neither: they stand in
	   the row, named, as the plates they will become, and nothing about them
	   invites the hand. A dashed border said the same thing too quietly to
	   read at a glance (owner, 2026-08-07: "the unavailable tiles look
	   active"). They are also not links, which the markup has always had
	   right — this is the part a reader sees rather than the part a screen
	   reader hears. */
	.way.soon {
		background: none;
		border-color: transparent;
	}

	.way.soon .way-title {
		color: var(--ink-soft);
	}

	.way.soon .way-note {
		font-style: italic;
	}

	/* Wider than the app's catalog column: the landing is read on
	   whatever screen finds it, and the specimen wants room for a whole
	   verse before it wraps. */
	section {
		margin: 3.2rem 0 0;
		width: 100%;
		max-width: 46rem;
	}

	.lead {
		margin: 0.5rem 0 0;
		line-height: 1.65;
	}

	/* The specimen is the reading surface itself — TextBody, the slider
	   and the panel carry their own styles — so all this page adds is the
	   frame. Left-set, as the book is. */
	.specimen {
		margin: 1.4rem 0 0;
		text-align: left;
	}

	.specimen-help {
		margin: 0 0 1.6rem;
	}

	/* The citation stands over its verse like a title — under the box it
	   pushed the analysis below the fold on a phone, right where the
	   tapping happens. Quiet, and still the door to the stanza's page. */
	.stanza-link {
		margin: 0 0 0.9rem;
		font-size: 0.8rem;
	}

	.stanza-link a {
		color: var(--ink-soft);
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	.stanza-link a:hover {
		color: var(--ink);
	}

	footer {
		margin: 3.6rem 0 0;
	}

	.privacy-line {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.foot-links {
		margin: 0.4rem 0 0;
		font-size: 0.9rem;
	}

	.foot-links a {
		color: var(--ink-soft);
	}

	.foot-links a:hover {
		color: var(--ink);
	}
</style>

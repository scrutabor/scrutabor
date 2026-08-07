<script lang="ts">
	// The landing: what Scrutabor is, shown before it is told. One page
	// per language, in the book's own face and voice. The specimen is the
	// book itself for one verse — verse 34 of Psalm 118, the motto's own,
	// straight from the corpus (see +page.server.ts) with the app's real
	// slider and the app's real word panel, fully alive.
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import WordCard from '$lib/components/WordCard.svelte';
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
		specimenTitle: string;
		specimenLead: string;
		stanzaLink: string;
		cards: { title: string; note: string; href: string }[];
		keepTitle: string;
		keepBody: string;
		keepAction: string;
		privacyLine: string;
		privacyLink: string;
		editioLink: string;
		sourcesLink: string;
	}

	const T: Record<Lang, Copy> = {
		pl: bindProse({
			title: 'Scrutabor — modlitwa po łacinie ze zrozumieniem',
			description:
				'Darmowy łaciński modlitewnik z analizą słowo po słowie: przekład, gramatyka i wymowa każdego słowa. Ordo Missæ z 1962 roku i modlitwy, także do pobrania.',
			open: 'Otwórz modlitewnik',
			openNote: 'w przeglądarce — bez instalacji, bez kont',
			specimenTitle: 'słowo po słowie',
			specimenLead:
				'Werset, od którego Scrutabor bierze nazwę — żywy, tak jak w modlitewniku: suwak pomocy prowadzi od samej łaciny do pełnego przekładu, a dotknięcie słowa otwiera jego analizę.',
			stanzaLink: 'Psalm\u00a0118, He — w.\u00a034',
			cards: [
				{
					title: 'podczas Mszy',
					note: 'całe Ordo Missæ z 1962 roku, część po części',
					href: 'ordo'
				},
				{
					title: 'modlitwy',
					note: 'Ojcze nasz, Zdrowaś Maryjo, Credo, antyfony maryjne…',
					href: ''
				},
				{
					title: 'do nauki',
					note: 'słownik z konkordancją, gramatyka, wymowa',
					href: 'grammatica'
				}
			],
			keepTitle: 'kopia do zabrania',
			keepBody:
				'Cały modlitewnik można pobrać i czytać w dowolnej przeglądarce — bez internetu, bez instalowania czegokolwiek. Po rozpakowaniu wystarczy otworzyć index.html. Raz pobrana kopia pozostaje na zawsze: nic nie łączy się z siecią, nic nie wygasa i wszystko będzie działać także wtedy, gdyby ta strona kiedyś zniknęła.',
			keepAction: 'Pobierz Scrutabor.zip',
			privacyLine: 'Bez kont, bez śledzenia, bez reklam.',
			privacyLink: 'prywatność',
			editioLink: 'jak powstaje to wydanie',
			sourcesLink: 'źródła na GitHubie'
		}),
		en: {
			title: 'Scrutabor — prayer in Latin, with understanding',
			description:
				'A free Latin prayer book with word-by-word analysis: translation, grammar, and pronunciation for every word. The 1962 Ordo Missæ and common prayers, downloadable too.',
			open: 'Open the prayer book',
			openNote: 'in your browser — nothing to install, no accounts',
			specimenTitle: 'word by word',
			specimenLead:
				'The verse Scrutabor takes its name from — alive, exactly as in the prayer book: the help slider moves from bare Latin to a full translation, and a tap on any word opens its analysis.',
			stanzaLink: 'Psalm\u00a0118, He — v.\u00a034',
			cards: [
				{ title: 'at Mass', note: 'the whole 1962 Ordo Missæ, part by part', href: 'ordo' },
				{
					title: 'the prayers',
					note: 'the Our Father, the Hail Mary, the Credo, the Marian antiphons…',
					href: ''
				},
				{
					title: 'for study',
					note: 'a dictionary with concordance, grammar, pronunciation',
					href: 'grammatica'
				}
			],
			keepTitle: 'a copy to keep',
			keepBody:
				'The whole prayer book can be downloaded and read in any browser — no internet, nothing to install. Unzipped, it opens from index.html. Once downloaded, the copy is permanent: nothing calls home, nothing expires, and it will keep working even if this website one day does not.',
			keepAction: 'Download Scrutabor.zip',
			privacyLine: 'No accounts, no tracking, no ads.',
			privacyLink: 'privacy',
			editioLink: 'how this edition is made',
			sourcesLink: 'source on GitHub'
		}
	};

	const t = $derived(T[lang]);

	// The zip travels with each release rather than with the site: the
	// stable GitHub URL always resolves to the newest release's asset.
	const ZIP = 'https://github.com/scrutabor/scrutabor-app/releases/latest/download/Scrutabor.zip';
</script>

<svelte:head>
	<title>{t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<div class="page centered landing">
	<SurfaceNav {lang} base="" />
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="tagline">{M[lang].tagline}</p>
		<p class="motto" lang="la">
			„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
		</p>
		<!-- The reference is a door: the psalm's stanza is in the book. -->
		<p class="motto-ref smallcaps">
			<a href="/app/{lang}/psalmi/118-he">{M[lang].mottoRef}</a>
		</p>

		<a class="cta" href="/app/{lang}">{t.open}</a>
		<p class="cta-note">{t.openNote}</p>

		<section class="specimen-section">
			<h2 class="smallcaps">{t.specimenTitle}</h2>
			<p class="lead">{t.specimenLead}</p>

			<!-- The book itself, for one verse: the real slider over the
			     real corpus text, and beneath them the analysis box — the
			     word panel's content, standing open in the page. A tap
			     chooses which word it explains; nothing closes. -->
			<div class="specimen">
				<div class="specimen-help">
					<HelpLevels {lang} bind:value={helpLevel} />
				</div>
				<p class="stanza-link smallcaps">
					<a href="/app/{lang}/psalmi/118-he">{t.stanzaLink} ›</a>
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
					<div class="word-box">
						<p class="word-box-form" lang="la">{selWord.form}</p>
						<WordCard
							word={selWord}
							gloss={selGloss}
							analysis={selAnalysis}
							lex={data.specimen.lex}
							{lang}
							onnavigate={(id) => (selected = id)}
						/>
					</div>
				{/if}
			</div>
		</section>

		<section>
			<div class="cards">
				{#each t.cards as card (card.title)}
					<a class="card" href="/app/{lang}{card.href ? `/${card.href}` : ''}">
						<span class="card-title">{card.title}</span>
						<span class="hung-note">{card.note}</span>
					</a>
				{/each}
			</div>
		</section>

		<section>
			<h2 class="smallcaps">{t.keepTitle}</h2>
			<p class="lead">{t.keepBody}</p>
			<p class="keep-action"><a href={ZIP} rel="external">{t.keepAction}</a></p>
		</section>

		<footer>
			<p class="privacy-line">{t.privacyLine}</p>
			<p class="foot-links">
				<a href="/{lang}/privacy">{t.privacyLink}</a>
				· <a href="/app/{lang}/editio">{t.editioLink}</a>
				· <a href="https://github.com/scrutabor" rel="external">{t.sourcesLink}</a>
			</p>
		</footer>
	</main>
</div>

<style>
	/* The nav row, .tagline, .motto and .motto-ref are shared furniture
	   (app.css): the same objects on the catalog and the routers. */

	/* The one loud thing on the page. Rubric red carries it in both
	   themes; the label is set in the page background colour, which
	   clears AA against the rubric in each (axe checks the rendered
	   pair). */
	.cta {
		display: inline-block;
		margin: 2.8rem 0 0;
		padding: 0.85rem 2.4rem;
		border-radius: 0.6rem;
		background: var(--rubric);
		color: var(--bg);
		text-decoration: none;
		font-size: 1.25rem;
	}

	.cta:hover {
		filter: brightness(1.08);
	}

	.cta:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}

	.cta-note {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
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

	/* The analysis box: the word panel's content, set in the page like a
	   quotation from the app — same surface, same border, no way to close
	   it, because on this page it IS the exhibit. */
	.word-box {
		margin: 1.6rem 0 0;
		padding: 1rem 1.3rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
	}

	.word-box-form {
		margin: 0;
		font-size: 1.7rem;
		font-weight: 500;
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
	}

	.stanza-link a:hover {
		color: var(--ink);
	}

	.motto-ref a {
		color: inherit;
		text-decoration: none;
	}

	.motto-ref a:hover {
		color: var(--ink);
		text-decoration: underline;
	}

	.keep-action {
		margin: 1rem 0 0;
	}

	.keep-action a {
		color: var(--rubric);
		font-size: 1.1rem;
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

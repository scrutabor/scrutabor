<script lang="ts">
	// The landing: what Scrutabor is, shown before it is told. One static
	// page per language, in the book's own face and voice. The specimen is
	// the actual reading mechanism — the motto's own verse rendered by the
	// app's own TextBody at each of the help slider's three steps — so the
	// page demonstrates the book by BEING the book for one verse.
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';
	import { SPECIMEN_DOC, SPECIMEN_GLOSS } from './specimen';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);

	interface Copy {
		title: string;
		description: string;
		open: string;
		openNote: string;
		specimenTitle: string;
		specimenLead: string;
		panelLemma: string;
		panelParse: string;
		panelNote: string;
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
				'Suwak pomocy prowadzi przez trzy stopnie — od samej łaciny do pełnego przekładu — a dotknięcie słowa otwiera jego analizę: formę, hasło słownikowe i objaśnienie.',
			panelLemma: 'scrutari — badać, zgłębiać',
			panelParse:
				'czasownik · 1. osoba liczby pojedynczej · czas przyszły · deponens (forma bierna, znaczenie czynne)',
			panelNote: '„Będę zgłębiał” — słowo, od którego ta aplikacja bierze nazwę.',
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
				'The help slider moves through three steps — from bare Latin to a full translation — and a tap on any word opens its analysis: the form, the dictionary entry, and an explanation.',
			panelLemma: 'scrutari — to search, to examine deeply',
			panelParse:
				'verb · 1st person singular · future · deponent (passive in form, active in meaning)',
			panelNote: '“I will search” — the word this app takes its name from.',
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
	const levels = $derived(M[lang].levels);

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
		<p class="motto-ref smallcaps">{M[lang].mottoRef}</p>

		<a class="cta" href="/app/{lang}">{t.open}</a>
		<p class="cta-note">{t.openNote}</p>

		<section class="specimen-section">
			<h2 class="smallcaps">{t.specimenTitle}</h2>
			<p class="lead">{t.specimenLead}</p>

			<!-- The slider's three steps on the verse the motto comes from,
			     each rendered by the app's own TextBody: bare Latin, the
			     interlinear gloss, and the gloss with the verse's translation
			     — exactly what the reading pages show at each stop. The
			     idPrefix keeps the three copies' word ids apart, as on the
			     ordo flow. -->
			<figure class="specimen">
				{#each [0, 1, 2] as level (level)}
					<div class="tier">
						<p class="tier-label smallcaps">{levels[level]}</p>
						<TextBody
							doc={SPECIMEN_DOC}
							gloss={SPECIMEN_GLOSS[lang]}
							{lang}
							helpLevel={level}
							idPrefix={`spec${level}`}
						/>
					</div>
				{/each}

				<!-- …and what a tap answers with, for the one word this book
				     is named after: the panel as the app draws it. -->
				<figcaption class="panel">
					<p class="panel-head" lang="la">scrutabor</p>
					<p class="panel-lemma">{t.panelLemma}</p>
					<p class="panel-parse">{t.panelParse}</p>
					<p class="panel-note">{t.panelNote}</p>
				</figcaption>
			</figure>
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

	/* The specimen is the reading surface itself — TextBody carries its
	   own styles — so all this page adds is the frame around each step.
	   Left-set, as the book is. */
	.specimen {
		margin: 0.6rem 0 0;
		text-align: left;
	}

	.tier {
		margin: 1.9rem 0 0;
	}

	.tier-label {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	/* What a tap answers with, as the app draws it: a quiet card. */
	.panel {
		margin: 2rem 0 0;
		padding: 0.9rem 1.2rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		text-align: left;
	}

	.panel p {
		margin: 0.2rem 0 0;
	}

	.panel-head {
		font-size: 1.3rem;
	}

	.panel-lemma {
		font-style: italic;
	}

	.panel-parse {
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.panel-note {
		margin-top: 0.55rem;
		font-size: 0.95rem;
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

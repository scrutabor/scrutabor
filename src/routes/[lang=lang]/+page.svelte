<script lang="ts">
	// The landing: what Scrutabor is, shown before it is told. One static
	// page per language, in the book's own face and voice — the specimen
	// below is the actual reading mechanism (ruby, gloss, panel), set by
	// hand on the words of the motto, so the page demonstrates the book
	// instead of describing it.
	import { M, otherLang, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const other = $derived(otherLang(lang));

	// The specimen: the opening of the motto, glossed word by word the way
	// every text in the book is. The panel under it is what a tap opens —
	// for the one word this book is named after.
	const SPECIMEN: { la: string; pl: string; en: string; name?: true }[] = [
		{ la: 'Da', pl: 'daj', en: 'give' },
		{ la: 'mihi', pl: 'mnie', en: 'to me' },
		{ la: 'intellectum,', pl: 'zrozumienie', en: 'understanding' },
		{ la: 'et', pl: 'i', en: 'and' },
		{ la: 'scrutabor', pl: 'będę zgłębiał', en: 'I will search', name: true },
		{ la: 'legem', pl: 'prawo', en: 'law' },
		{ la: 'tuam', pl: 'twoje', en: 'your' }
	];

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
		what: { title: string; body: string }[];
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
				'Pod każdym słowem stoi jego znaczenie, a dotknięcie otwiera resztę: formę, hasło słownikowe i objaśnienie.',
			panelLemma: 'scrutari — badać, zgłębiać',
			panelParse:
				'czasownik · 1. osoba liczby pojedynczej · czas przyszły · deponens (forma bierna, znaczenie czynne)',
			panelNote: '„Będę zgłębiał” — słowo, od którego ta książka ma imię.',
			what: [
				{
					title: 'podczas Mszy',
					body: 'Całe Ordo Missæ z 1962 roku, część po części. Widać, kto mówi i co słychać; odpowiedzi wiernych są zaznaczone, a modlitwy odmawiane po cichu — opisane.'
				},
				{
					title: 'modlitwy',
					body: 'Ojcze nasz, Zdrowaś Maryjo, Credo, antyfony maryjne — każda ze słowem po słowie i przekładem, a zbiór rośnie.'
				},
				{
					title: 'do nauki',
					body: 'Hasła słownikowe z konkordancją, strony gramatyki z przykładami z modlitw, wymowa w tradycji rzymskiej i polskiej.'
				}
			],
			keepTitle: 'kopia do zabrania',
			keepBody:
				'Całą książkę można pobrać i otworzyć w dowolnej przeglądarce — bez internetu, bez instalowania czegokolwiek. Rozpakuj folder i otwórz index.html. Ta kopia jest Twoja: nic nie łączy się z siecią, nic nie wygasa i będzie działać także wtedy, gdyby ta strona kiedyś przestała.',
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
				'Under every word stands its meaning, and a tap opens the rest: the form, the dictionary entry, and an explanation.',
			panelLemma: 'scrutari — to search, to examine deeply',
			panelParse:
				'verb · 1st person singular · future · deponent (passive in form, active in meaning)',
			panelNote: '“I will search” — the word this book takes its name from.',
			what: [
				{
					title: 'at Mass',
					body: 'The whole Ordo Missæ of 1962, part by part. It shows who speaks and what is heard; the answers of the faithful are marked, and the prayers said silently are named.'
				},
				{
					title: 'the prayers',
					body: 'The Our Father, the Hail Mary, the Credo, the Marian antiphons — each with its word-by-word gloss and a translation, and the collection is growing.'
				},
				{
					title: 'for study',
					body: 'Dictionary entries with a concordance, grammar pages with examples drawn from the prayers, and pronunciation in the Roman tradition.'
				}
			],
			keepTitle: 'a copy to keep',
			keepBody:
				'The whole book can be downloaded and opened in any browser — no internet, nothing to install. Unzip the folder and open index.html. This copy is yours: nothing calls home, nothing expires, and it will keep working even if this website one day does not.',
			keepAction: 'Download Scrutabor.zip',
			privacyLine: 'No accounts, no tracking, no ads.',
			privacyLink: 'privacy',
			editioLink: 'how this edition is made',
			sourcesLink: 'source on GitHub'
		}
	};

	const t = $derived(T[lang]);
</script>

<svelte:head>
	<title>{t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<div class="page centered landing">
	<nav>
		<a class="other-lang" href="/{other}" lang={other}>{M[other].langName}</a>
	</nav>
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
			<figure class="specimen">
				<p class="specimen-line" lang="la">
					{#each SPECIMEN as w (w.la)}<span class="sw" class:named={w.name}
							><ruby><span class="sw-base">{w.la}</span><rt {lang}>{w[lang]}</rt></ruby></span
						>{' '}{/each}
				</p>
				<figcaption class="panel">
					<p class="panel-head" lang="la">scrutabor</p>
					<p class="panel-lemma">{t.panelLemma}</p>
					<p class="panel-parse">{t.panelParse}</p>
					<p class="panel-note">{t.panelNote}</p>
				</figcaption>
			</figure>
		</section>

		{#each t.what as block (block.title)}
			<section class="what-section">
				<h2 class="smallcaps">{block.title}</h2>
				<p class="lead">{block.body}</p>
			</section>
		{/each}

		<section class="what-section">
			<h2 class="smallcaps">{t.keepTitle}</h2>
			<p class="lead">{t.keepBody}</p>
			<p class="keep-action"><a href="/Scrutabor.zip" download>{t.keepAction}</a></p>
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
	nav {
		display: flex;
		justify-content: flex-end;
	}

	.other-lang {
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 0.95rem;
		padding: 0.3rem 0;
	}

	.other-lang:hover {
		color: var(--ink);
	}

	/* .tagline, .motto and .motto-ref are the brand furniture, shared with
	   the catalog and the routers via app.css. */

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

	section {
		margin: 3.2rem 0 0;
		width: 100%;
		max-width: 30rem;
	}

	.lead {
		margin: 0.5rem 0 0;
		line-height: 1.65;
	}

	/* The specimen is the reading surface in miniature: the same ruby
	   mechanism, the same proportions, a wash on the word whose panel is
	   open — so what the page promises is what the page shows. */
	.specimen {
		margin: 1.6rem 0 0;
	}

	.specimen-line {
		font-size: 1.45rem;
		line-height: 2.3;
		margin: 0;
	}

	.specimen-line ruby {
		ruby-position: under;
		-webkit-ruby-align: start;
		ruby-align: start;
	}

	.specimen-line rt {
		font-size: 0.64em;
		color: var(--ink-soft);
		letter-spacing: 0.01em;
	}

	.sw {
		display: inline-block;
	}

	.sw.named .sw-base,
	.sw.named rt {
		background: var(--wash-strong);
	}

	.sw.named rt {
		color: var(--ink);
	}

	.sw-base {
		padding: 0.06em 0.069em;
		margin-inline: -0.069em;
		border-radius: 0.172em;
	}

	/* What a tap answers with, as the app draws it: a quiet card. */
	.panel {
		margin: 1.4rem 0 0;
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

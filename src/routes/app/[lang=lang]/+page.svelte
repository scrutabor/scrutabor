<script lang="ts">
	import { catalogFor, type CatalogSection } from '$lib/catalog';
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const available = $derived(new Set(data.available as string[]));
	// A section may be declared with no texts — `proprium` is, because the
	// day's own texts are reached through the Ordo and not through a shelf
	// (see lib/catalog). Declared-but-empty must not print a bare heading.
	const shelves = $derived(catalogFor(available).filter((section) => section.texts.length > 0));
	const primarySections = $derived(shelves.filter((section) => section.category === 'orationes'));
	const secondarySections = $derived(shelves.filter((section) => section.category !== 'orationes'));
	const footerCopy = $derived(
		lang === 'pl'
			? bindProse({
					aria: 'Strony pomocnicze i informacje o wydaniu',
					grammar: 'Pojęcia, składnia i wymowa',
					bibliography: 'Świadectwa tekstu, przekładu i kontekstu',
					edition: 'O wydaniu',
					status: 'Wydanie robocze przed przeglądem eksperckim'
				})
			: {
					aria: 'Reference pages and edition information',
					grammar: 'Concepts, syntax, and pronunciation',
					bibliography: 'Textual, translation, and contextual witnesses',
					edition: 'About this edition',
					status: 'Working edition awaiting expert review'
				}
	);
</script>

{#snippet shelf(section: CatalogSection)}
	<section>
		<h2 class="smallcaps">{section.label[lang]}</h2>
		<div class="cards">
			{#each section.texts as t (t.slug)}
				<a class="card" href="/app/{lang}/{t.category}/{t.slug}">
					<span class="card-title" lang="la">{t.title}</span>
					<span class="hung-note">{t.localizedTitle[lang] ?? t.title}</span>
				</a>
			{/each}
		</div>
	</section>
{/snippet}

<svelte:head>
	<title>Scrutabor — {msgs.tagline.toLowerCase().replace(/\.$/, '')}</title>
	<meta name="description" content={msgs.catalogDescription} />
</svelte:head>

<div class="page centered landing">
	<SurfaceNav {lang} />
	<main>
		<header class="catalog-hero">
			<h1 class="smallcaps">Scrutabor</h1>
			<p class="tagline">{msgs.tagline}</p>
			<p class="motto" lang="la">
				„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
			</p>
			<!-- The citation is a door, as it is on the landing: the verse the
			     edition is named from is IN the book, and the reader who
			     wonders where the motto comes from should be able to open it
			     rather than hunt for the psalm shelf at the foot of the page. -->
			<p class="motto-ref smallcaps">
				<a href="/app/{lang}/psalmi/118-he?v=34">{msgs.mottoRef}</a>
			</p>
		</header>

		<!-- Two ways to use the book, and they are not used together:
		     following the whole Mass, or opening one text. The flow is a way
		     IN, not another text — so it stands apart from the shelves, above
		     the spread and on the page's own centre line rather than at the
		     head of one of two columns. -->
		<a class="flow" href="/app/{lang}/ordo">
			<span class="flow-title" lang="la">Ordo Missæ</span>
			<span class="flow-lead">{msgs.ordoLead}</span>
		</a>

		<div class="catalog-spread">
			<div class="catalog-column catalog-primary">
				{#each primarySections as section (section.category)}
					{@render shelf(section)}
				{/each}
			</div>

			<div class="catalog-column catalog-secondary">
				{#each secondarySections as section (section.category)}
					{@render shelf(section)}
				{/each}
			</div>
		</div>

		<footer class="catalog-footer">
			<nav class="footer-links" aria-label={footerCopy.aria}>
				<a class="card footer-link" href="/app/{lang}/grammatica">
					<span class="card-title">{msgs.grammarPageTitle}</span>
					<span class="hung-note">{footerCopy.grammar}</span>
				</a>
				<a class="card footer-link" href="/app/{lang}/bibliographia">
					<span class="card-title">{msgs.bibliographyPageTitle}</span>
					<span class="hung-note">{footerCopy.bibliography}</span>
				</a>
			</nav>
			<!-- The colophon: which copy this is, and the way home. A book
			     names its edition and its printer on the colophon page, not on
			     every leaf — so it lives here, on the book's own front page,
			     and nowhere in the reading chrome. In the downloaded folder
			     the link opens the live site (see offline/shims/navigation):
			     "is there a new version" is a network question. -->
			<p class="working smallcaps">
				<a href="/app/{lang}/editio">{footerCopy.edition} · {footerCopy.status}</a>
			</p>
			<p class="colophon smallcaps">
				Scrutabor · {msgs.edition}&nbsp;v{data.version} · <a href="/{lang}">scrutabor.org</a>
			</p>
		</footer>
	</main>
</div>

<style>
	/* The nav row, .tagline, .motto and .motto-ref are shared furniture
	   (app.css): the same objects on the landing and the routers. */
	.catalog-hero,
	.catalog-column,
	.catalog-footer {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
	}

	.catalog-spread {
		width: 100%;
	}

	/* The book's own mark for a link that is not a card: the dotted rule
	   under the ink, as on the colophon below and on the landing. */
	.motto-ref a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	.motto-ref a:hover {
		color: var(--ink);
	}

	section {
		margin: 2.6rem 0 0;
		width: 100%;
		max-width: 30rem;
	}

	.card-title {
		font-size: 1.35rem;
	}

	/* The way into the Mass: set apart from the cards by its rubric rule
	   and its lead, so it reads as a door rather than as an entry in a
	   list. It is NOT set apart by size — a card's padding and barely more
	   than a card's title. Standing alone above the spread is emphasis
	   enough, and a box built to twice a card's height only shouted. */
	.flow {
		display: block;
		width: 100%;
		max-width: 30rem;
		margin: 2.8rem 0 0;
		padding: 0.8rem 1.4rem 0.9rem;
		text-align: left;
		text-decoration: none;
		border: 1px solid var(--rubric);
		border-radius: 0.6rem;
		background: var(--surface);
	}

	.flow:hover {
		background: var(--wash);
	}

	.flow-title {
		display: block;
		font-size: 1.45rem;
		color: var(--rubric);
	}

	.flow-lead {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	.catalog-footer {
		max-width: 44rem;
		margin: 4rem auto 0;
		padding-top: 1.15rem;
		border-top: 1px solid var(--border);
	}

	.footer-links {
		display: grid;
		width: 100%;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.working {
		margin: 0.85rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.working a {
		color: inherit;
		text-decoration: none;
	}

	.working a:hover {
		color: var(--ink);
	}

	.colophon {
		margin: 0.4rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.colophon a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	.colophon a:hover {
		color: var(--ink);
	}

	@media (max-width: 34rem) {
		.footer-links {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* At laptop width the catalogue becomes an open spread: the prayer
	   shelf on the left, the Ordinary and Psalms on the right, with the way
	   into the Mass centred above both. 80rem is a 1280px laptop with its
	   browser chrome, and below it the columns stack.

	   INSIDE THE SHARED FRAME (owner, 2026-08-16). It first widened the
	   page to 88rem, which made the catalogue the one surface in the book
	   that did not agree with the others: a reader leaving a prayer for the
	   index watched the whole page jump 460 pixels wider. A spread is a way
	   of using the frame, not a reason to break it — so the two columns
	   divide the same measure every reading page holds. */
	@media (min-width: 80rem) {
		.page.landing main {
			justify-content: flex-start;
		}

		.catalog-hero {
			padding-top: 2rem;
		}

		.flow {
			margin: 2.8rem auto 0;
		}

		.catalog-spread {
			position: relative;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 2.6rem;
			margin: 3.2rem auto 0;
			text-align: left;
		}

		.catalog-spread::before {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 50%;
			width: 1px;
			content: '';
			background: var(--border);
		}

		.catalog-column {
			align-items: stretch;
		}

		.catalog-primary {
			padding-right: 0.3rem;
		}

		.catalog-secondary {
			padding-left: 0.3rem;
		}

		section {
			max-width: none;
		}

		.catalog-column section:first-child {
			margin-top: 0;
		}

		.card {
			min-height: 4.15rem;
			padding-block: 0.95rem;
		}

		.catalog-footer {
			margin-top: 2.6rem;
		}
	}
</style>

<script lang="ts">
	import { CATALOG, type CatalogSection } from '$lib/catalog';
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import { M, type Lang } from '$lib/i18n';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const primarySections = CATALOG.filter((section) => section.category === 'orationes');
	const secondarySections = CATALOG.filter((section) => section.category !== 'orationes');
</script>

{#snippet shelf(section: CatalogSection)}
	<section>
		<h2 class="smallcaps">{section.label[lang]}</h2>
		<div class="cards">
			{#each section.texts as t (t.slug)}
				<a class="card" href="/app/{lang}/{t.category}/{t.slug}">
					<span class="card-title" lang="la">{t.title}</span>
					<span class="hung-note">{t.localizedTitle[lang]}</span>
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
			<p class="motto-ref smallcaps">{msgs.mottoRef}</p>
		</header>

		<div class="catalog-spread">
			<div class="catalog-column catalog-primary">
				<!-- Two ways to use the book, and they are not used together:
				     following the whole Mass, or opening one text. The flow is a way
				     IN, not another text — so it stands apart from the shelves. -->
				<a class="flow" href="/app/{lang}/ordo">
					<span class="flow-title" lang="la">Ordo Missæ</span>
					<span class="flow-lead">{msgs.ordoLead}</span>
				</a>

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
			<p class="grammar-link smallcaps">
				<a href="/app/{lang}/grammatica">{msgs.grammarTitle} →</a>
			</p>
			<p class="working smallcaps"><a href="/app/{lang}/editio">{msgs.working}</a></p>
			<p class="bibliography-link smallcaps">
				<a href="/app/{lang}/bibliographia">{msgs.bibliographyTitle}</a>
			</p>
			<!-- The colophon: which copy this is, and the way home. A book
			     names its edition and its printer on the colophon page, not on
			     every leaf — so it lives here, on the book's own front page,
			     and nowhere in the reading chrome. In the downloaded folder
			     the link opens the live site (see offline/shims/navigation):
			     "is there a new version" is a network question. -->
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

	section {
		margin: 2.6rem 0 0;
		width: 100%;
		max-width: 30rem;
	}

	.card-title {
		font-size: 1.35rem;
	}

	/* The way into the Mass: wider, quieter and set apart from the cards,
	   so it reads as a door rather than as an entry in a list. */
	.flow {
		display: block;
		width: 100%;
		max-width: 30rem;
		margin: 2.8rem 0 0;
		padding: 1.1rem 1.4rem 1.2rem;
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
		font-size: 1.7rem;
		color: var(--rubric);
	}

	.flow-lead {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.95rem;
		font-style: italic;
		color: var(--ink-soft);
	}

	.grammar-link {
		margin: 3rem 0 0;
		font-size: 0.8rem;
	}

	.grammar-link a {
		color: var(--ink-soft);
		text-decoration: none;
	}

	.grammar-link a:hover {
		color: var(--ink);
	}

	.working {
		margin: 0.6rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.bibliography-link {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
	}

	.bibliography-link a {
		color: var(--ink-soft);
		text-decoration: none;
	}

	.bibliography-link a:hover {
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

	/* Past laptop width the catalogue becomes an open spread: the primary
	   way through the Mass and the prayer shelf on the left, the Ordinary
	   and Psalms on the right. Reading pages keep their established measure;
	   only this choosing surface uses the room a large monitor gives it. */
	@media (min-width: 96rem) {
		.page.landing {
			max-width: 88rem;
			padding-inline: 3rem;
		}

		.page.landing main {
			justify-content: flex-start;
		}

		.catalog-hero {
			max-width: 42rem;
			margin-inline: auto;
			padding-top: 2rem;
		}

		.catalog-spread {
			position: relative;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 5rem;
			max-width: 82rem;
			margin: 3.4rem auto 0;
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

		section,
		.flow {
			max-width: none;
		}

		.flow,
		.catalog-secondary section:first-child {
			margin-top: 0;
		}

		.card {
			min-height: 4.15rem;
			padding-block: 0.95rem;
		}

		.catalog-footer {
			margin-top: 0.8rem;
		}
	}
</style>

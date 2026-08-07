<script lang="ts">
	import { CATALOG } from '$lib/catalog';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import TextSize from '$lib/components/TextSize.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
</script>

<svelte:head>
	<title>Scrutabor — {msgs.tagline.toLowerCase().replace(/\.$/, '')}</title>
	<meta name="description" content={msgs.catalogDescription} />
</svelte:head>

<div class="page centered landing">
	<nav>
		<LangMenu {lang} />
		<TextSize {lang} />
		<ThemeToggle {lang} />
	</nav>
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="tagline">{msgs.tagline}</p>
		<p class="motto" lang="la">
			„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
		</p>
		<p class="motto-ref smallcaps">{msgs.mottoRef}</p>

		<!-- Two ways to use the book, and they are not used together:
		     following the whole Mass, or opening one text. The flow is a way
		     IN, not another text — so it stands apart, above the catalog,
		     instead of heading a list it does not belong to. -->
		<a class="flow" href="/app/{lang}/ordo">
			<span class="flow-title" lang="la">Ordo Missæ</span>
			<span class="flow-lead">{msgs.ordoLead}</span>
		</a>

		{#each CATALOG as section (section.category)}
			<section>
				<h2 class="smallcaps">{section.label[lang]}</h2>
				<div class="cards">
					{#each section.texts as t (t.slug)}
						<a class="card" href="/app/{lang}/{t.category}/{t.slug}">
							<span class="card-title" lang="la">{t.title}</span>
							<span class="hung-note">{t.note[lang]}</span>
						</a>
					{/each}
				</div>
			</section>
		{/each}

		<p class="grammar-link smallcaps">
			<a href="/app/{lang}/grammatica">{msgs.grammarTitle} →</a>
		</p>
		<p class="working smallcaps"><a href="/app/{lang}/editio">{msgs.working}</a></p>
	</main>
</div>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 0.5rem;
	}

	/* .tagline, .motto and .motto-ref are the brand furniture, shared with
	   the landing pages and the routers via app.css. */

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
</style>

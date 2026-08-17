<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const copy = $derived(
		lang === 'pl'
			? {
					lead: 'Zestawienie obejmuje źródła przywołane w objaśnieniach widocznych dla czytelnika. Dokładny odsyłacz pozostaje także przy każdym objaśnieniu. Świadkowie tekstu i aparat krytyczny są udostępnione osobno w repozytorium korpusu.',
					usedAt: 'przywołano przy'
				}
			: {
					lead: 'This list contains the sources cited by explanations visible to the reader. The exact reference also remains beside each explanation. Textual witnesses and the critical apparatus are published separately in the corpus repository.',
					usedAt: 'cited at'
				}
	);
	const lead = $derived(lang === 'pl' ? bindProse(copy.lead) : copy.lead);
</script>

<svelte:head>
	<title>{msgs.bibliographyTitle} — Scrutabor</title>
	<meta name="description" content={msgs.bibliographyDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />

	<main>
		<h1 class="minor">{msgs.bibliographyTitle}</h1>
		<p class="latin-name" lang="la">bibliographia</p>
		<p class="what">{lead}</p>

		<div class="sources">
			{#each data.sources as source (source.title)}
				<section>
					<h2><cite lang="und">{source.title}</cite></h2>
					<ul>
						{#each source.locators as locator (`${locator.locator}:${locator.url ?? ''}`)}
							<li>
								{#if locator.url}
									<a
										class="external"
										href={locator.url}
										target="_blank"
										rel="external noopener"
										lang="und">{locator.locator}</a
									>
								{:else}
									<span lang="und">{locator.locator}</span>
								{/if}
								<span class="uses">
									— {copy.usedAt}
									{#each locator.uses as use, i (use.href)}
										{#if i > 0},
										{/if}<a href={use.href} lang="la">{use.title}</a>
									{/each}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</main>
</div>

<style>
	.latin-name {
		margin: 0.2rem 0 0;
		text-align: center;
		color: var(--rubric);
		font-style: italic;
	}

	/* The opening paragraph takes the shared prose measure (app.css); the
	   entries beneath it are rows, like the concordance on a lemma page,
	   so they take the frame. */
	.what {
		margin-top: 1.4rem;
		line-height: 1.65;
	}

	.sources {
		margin-top: 2.2rem;
	}

	section + section {
		margin-top: 1.8rem;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	cite {
		font-style: normal;
	}

	ul {
		margin: 0.55rem 0 0;
		padding-inline-start: 1.35rem;
	}

	li {
		line-height: 1.5;
	}

	li + li {
		margin-top: 0.45rem;
	}

	a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	a:hover {
		color: var(--rubric);
	}

	.uses {
		color: var(--ink-soft);
	}
</style>

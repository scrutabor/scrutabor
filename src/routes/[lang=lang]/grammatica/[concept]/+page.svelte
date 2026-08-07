<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { conceptById } from '$lib/grammar';
	import { M, type Lang } from '$lib/i18n';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const concept = $derived(conceptById(data.concept));
</script>

<svelte:head>
	<title>{concept ? `${concept.label[lang]} — Scrutabor` : 'Scrutabor'}</title>
	{#if concept}
		<meta name="description" content={concept.what[lang]} />
	{/if}
</svelte:head>

<div class="page">
	<PageNav {lang} href="/{lang}/grammatica" label={msgs.grammarTitle} />

	{#if !concept}
		<main>
			<p class="notfound">{msgs.notFound}</p>
		</main>
	{:else}
		<main>
			<h1 class="minor">{concept.label[lang]}</h1>
			{#if concept.la !== concept.label[lang]}
				<p class="latin-name" lang="la">{concept.la}</p>
			{/if}
			<p class="what">{concept.what[lang]}</p>
			{#if concept.spot}
				<p class="spot">{concept.spot[lang]}</p>
			{/if}

			<section class="examples">
				<h2 class="smallcaps">{msgs.occurrences}</h2>
				{#each concept.examples as ex (ex.textKey + ex.wordId)}
					<div class="example">
						<p class="example-la" lang="la">
							<a href="/{lang}/{ex.textKey}?w={ex.wordId}">{ex.la}</a>
						</p>
						<p class="example-note">{ex.note[lang]}</p>
					</div>
				{/each}
			</section>
		</main>
	{/if}
</div>

<style>
	.latin-name {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
	}

	.what {
		margin: 1.6rem auto 0;
		max-width: 30rem;
		font-size: 1.1rem;
		line-height: 1.6;
	}

	.spot {
		margin: 0.7rem auto 0;
		max-width: 30rem;
		color: var(--ink-soft);
		font-size: 1rem;
		line-height: 1.55;
	}

	.examples {
		margin: 2.4rem auto 0;
		max-width: 30rem;
	}

	.example {
		margin: 0 0 1.1rem;
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: 0.9rem;
	}

	.example-la {
		margin: 0;
		font-size: 1.2rem;
	}

	.example-la a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.example-la a:hover {
		color: var(--rubric);
	}

	.example-note {
		margin: 0.15rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.notfound {
		margin: 3rem 0;
		text-align: center;
		color: var(--ink-soft);
	}
</style>

<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { PROPER_DAYS, SEASONS } from '$lib/proprium';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	let query = $state('');

	function normalise(value: string): string {
		return value
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/ł/g, 'l');
	}

	const filtered = $derived(
		PROPER_DAYS.filter((day) =>
			normalise(`${day.title[lang]} ${day.title.la}`).includes(normalise(query.trim()))
		)
	);
</script>

<svelte:head>
	<title>{msgs.dayPicker.catalogTitle} — Scrutabor</title>
	<meta name="description" content={msgs.dayPicker.catalogDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />
	<main>
		<h1>{msgs.dayPicker.catalogTitle}</h1>
		<p class="lead">{msgs.dayPicker.catalogDescription}</p>
		<p class="ordo-link"><a href="/app/{lang}/ordo" lang="la">Ordo Missæ</a></p>
		<label class="search">
			<span class="smallcaps">{msgs.dayPicker.searchLabel}</span>
			<input type="search" bind:value={query} placeholder={msgs.dayPicker.searchPlaceholder} />
		</label>
		{#if filtered.length === 0}
			<p role="status">{msgs.dayPicker.noResults}</p>
		{:else}
			{#each SEASONS as season (season)}
				{@const days = filtered.filter((day) => day.season === season)}
				{#if days.length}
					<section class="season-group" aria-labelledby={`season-${season}`}>
						<h2 id={`season-${season}`} class="smallcaps">{msgs.seasons[season]}</h2>
						<ul>
							{#each days as day (day.id)}
								<li>
									<a href="/app/{lang}/formularium/{day.id}" data-formulary={day.id}>
										{day.title[lang]}{#if day.partial}
											<small>{msgs.dayPartial}</small>{/if}
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			{/each}
		{/if}
	</main>
</div>

<style>
	main {
		max-width: 38rem;
		margin-inline: auto;
	}
	h1 {
		text-align: center;
	}
	.lead {
		color: var(--ink-soft);
		margin-block: 1rem 0.5rem;
	}
	.ordo-link {
		margin-block-end: 1.5rem;
	}
	.search {
		display: grid;
		gap: 0.3rem;
		margin-block-end: 1.5rem;
	}
	.search span {
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
	.search input {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		padding: 0.5rem 0.65rem;
	}
	.season-group {
		border-top: 1px solid var(--border);
		padding-block: 1rem;
	}
	h2 {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin: 0 0 0.5rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li a {
		display: block;
		padding: 0.45rem 0.5rem;
		color: var(--ink);
		border-radius: 0.35rem;
		text-decoration: none;
	}
	li a:hover {
		background: var(--wash);
		color: var(--rubric);
	}
	small {
		color: var(--ink-soft);
	}
	@media print {
		.search,
		.ordo-link {
			display: none;
		}
	}
</style>

<script lang="ts">
	// A commemoration resolved per date has no orations of its own: the impeded Sunday says
	// the Collect, Secret and Postcommunion of whichever Sunday the feast displaces, the Advent
	// feria those of the Sunday whose Mass the weekday would say, and the impeded feast says its
	// own in the Mass of the Sunday that keeps its day. Its page therefore says the rule in words
	// and lists, under each feast, the dates this edition resolves and the Sunday of each: the
	// one commemorated, or the one whose Mass is said. An Ember day of Advent, whose own Mass
	// this edition does not yet carry, is named without a link. The orations are read on their
	// formulary's own page and in the Order of Mass of the chosen day, never copied here.
	import FormularyScopeNote from '$lib/components/FormularyScopeNote.svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';

	interface ResolvedDate {
		date: string;
		/** The pair's other formulary: the Sunday beside the feast the date stands under, or a Mass
		 * this edition does not yet carry. */
		formulary: string | null;
		title: Record<string, string> | null;
		/** The other formulary is a Mass of this edition, with a page of its own to open. */
		authored: boolean;
		/** Admitted in at least one situation of the Mass: its orations are in this edition. */
		said: boolean;
	}
	interface ResolvedReading {
		lang: string;
		day: string;
		title: Record<string, string>;
		feasts: { id: string; title: Record<string, string>; dates: ResolvedDate[] }[];
	}
	let { data }: { data: ResolvedReading } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const rules = $derived(msgs.commemorationRules[data.day] ?? []);
	const dateFormat = $derived(
		new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);
	const civil = (date: string) => dateFormat.format(new Date(`${date}T12:00:00`));
</script>

<svelte:head>
	<title>{data.title.la} — Scrutabor</title>
	<meta name="description" content={msgs.readingDescription.replace('{title}', data.title[lang])} />
</svelte:head>

<div class="page">
	<header>
		<PageNav {lang} parent="/app/{lang}/ordo" parentLabel="Ordo Missæ" parentLang="la" />
		<h1 lang="la">{data.title.la}</h1>
		<p class="subtitle">{data.title[lang]}</p>
		<FormularyScopeNote {lang} centered />
	</header>

	<main class="resolved">
		{#each rules as rule, index (index)}
			<p class="rule">{rule}</p>
		{/each}
		<h2 class="smallcaps">{msgs.commemorationDates}</h2>
		{#each data.feasts as feast (feast.id)}
			<section class="resolved-feast" aria-labelledby="feast-{feast.id}" data-feast={feast.id}>
				<h3 id="feast-{feast.id}">
					<a href="/app/{lang}/formularium/{feast.id}">{feast.title[lang]}</a>
				</h3>
				<ol class="resolved-dates">
					{#each feast.dates as row (row.date)}
						<li data-date={row.date}>
							<time datetime={row.date}>{civil(row.date)}</time>
							<span class="resolved-formulary">
								{#if row.title && row.formulary && row.authored}
									<a href="/app/{lang}/formularium/{row.formulary}" data-formulary={row.formulary}
										>{row.title[lang]}</a
									>
								{:else if row.title && row.formulary}
									<span data-absent={row.formulary}>{row.title[lang]}</span>
								{:else}
									{data.title[lang]}
								{/if}
								{#if !row.said}<small>{msgs.commemorationPrayersMissing}</small>{/if}
							</span>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</main>
</div>

<style>
	.page > header {
		padding-bottom: 1.3rem;
	}

	.resolved {
		max-width: 40rem;
		margin-inline: auto;
	}

	.rule {
		margin: 0 0 1rem;
		line-height: 1.55;
	}

	.resolved > h2 {
		margin: 2rem 0 0.6rem;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.resolved-feast {
		padding-block: 0.9rem;
		border-top: 1px solid var(--border);
	}

	.resolved-feast h3 {
		margin: 0 0 0.45rem;
		font-size: 1.05rem;
		font-weight: 500;
	}

	.resolved-feast h3 a {
		color: var(--ink);
	}

	.resolved-dates {
		display: grid;
		gap: 0.3rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.resolved-dates li {
		display: grid;
		grid-template-columns: minmax(8.5rem, max-content) 1fr;
		gap: 0 1rem;
		font-size: 0.92rem;
	}

	.resolved-dates time {
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.resolved-formulary small {
		display: block;
		color: var(--ink-soft);
	}

	@media (max-width: 30rem) {
		.resolved-dates li {
			grid-template-columns: 1fr;
		}
	}
</style>

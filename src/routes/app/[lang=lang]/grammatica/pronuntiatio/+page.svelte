<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindPlFields } from '$lib/polish';
	import { PRONUNCIATION_RULES as rules } from '$lib/pronuntiatio-rules';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);

	// Rule rows: grapheme, Roman, Polish, example (corpus deep link when we
	// have one). Kept as data so the table stays honest and greppable.

	// The names of the three value columns, wanted in two places: over the
	// columns, and beside each value where the table stands as a stack of
	// blocks instead (see the container query below).
	const cols = $derived(
		lang === 'pl'
			? { roman: 'rzymska', polish: 'polska', example: 'przykład' }
			: { roman: 'Roman', polish: 'Polish', example: 'example' }
	);

	// The ~20 symbols a reader meets, each with an anchor word.
	const symbols: { s: string; pl: string; en: string }[] = bindPlFields([
		{
			s: 'a ɛ i ɔ u',
			pl: 'jak polskie a, e, i, o, u',
			en: 'as in father, met, machine, sort, rule'
		},
		{ s: 'j', pl: 'jak j w „jutro”', en: 'as y in yes' },
		{
			s: 'k g',
			pl: 'jak k i g w „kot”, „góra” — g zawsze twarde',
			en: 'as in kind, go — g always hard'
		},
		{ s: 'tʃ', pl: 'jak cz w „czas”', en: 'as ch in church' },
		{ s: 'ts', pl: 'jak c w „co”', en: 'as ts in cats' },
		{ s: 'dʒ', pl: 'jak dż w „dżem”', en: 'as j in joy' },
		{ s: 'ʃ', pl: 'jak sz w „szum”', en: 'as sh in ship' },
		{ s: 'ɲ', pl: 'jak ń w „koń”', en: 'as ny in canyon' },
		{ s: 'x', pl: 'jak ch w „chleb”', en: 'as ch in loch' },
		{ s: 'dz', pl: 'jak dz w „dzwon”', en: 'as ds in lads' },
		{ s: 's z v r', pl: 'jak s, z, w, r (r drżące)', en: 'as in sit, zeal, vine, with r rolled' },
		{
			s: 'kw kv gw',
			pl: 'jak kw w „kwiat”, gw jak w „gwiazda”',
			en: 'as qu in quick, gw as in Gwen'
		},
		{ s: 'ˈ', pl: 'akcent — pada na następną sylabę', en: 'stress — falls on the next syllable' },
		{ s: '.', pl: 'granica sylaby', en: 'syllable boundary' }
	]);
</script>

<svelte:head>
	<title>{lang === 'pl' ? 'wymowa' : 'pronunciation'} — Scrutabor</title>
	<meta name="description" content={msgs.pronunciationDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} parent="/app/{lang}/grammatica" parentLabel={msgs.grammarTitle} />

	<main>
		<h1 class="minor">{lang === 'pl' ? 'wymowa' : 'pronunciation'}</h1>
		<p class="latin-name" lang="la">pronuntiatio</p>

		{#if lang === 'pl'}
			<p class="what">
				Transkrybujemy wymowę <strong>rzymską</strong> (kościelną, „włoską”) — tę, którą śpiewają
				księgi z&nbsp;1962 roku i&nbsp;schole gregoriańskie — a&nbsp;tam, gdzie polska tradycja
				parafialna różni się od rzymskiej, pokazujemy obie: <span class="smallcaps">rz.</span>
				(rzymska) i&nbsp;<span class="smallcaps">pol.</span> (polska). Za świętego Piusa&nbsp;X Rzym zachęcał
				cały Kościół do wymowy rzymskiej, ale tradycje narodowe — w&nbsp;tym polska — przetrwały w&nbsp;parafiach
				i&nbsp;obie są dziś w&nbsp;użyciu.
			</p>
			<p class="what">
				Podział na sylaby jest w&nbsp;obu tradycjach ten sam — w&nbsp;śpiewie każda sylaba dostaje
				swoją nutę i&nbsp;„grá-ti-a” ma trzy sylaby w&nbsp;Rzymie i&nbsp;w&nbsp;Polsce. W&nbsp;mowie
				potocznej polszczyzna ściąga „-tia” do jednej sylaby („gracja”), a&nbsp;nasze transkrypcje
				zachowują podział śpiewany. Polska tradycja nie jest też jednolita — różni się między
				regionami i&nbsp;pokoleniami, więc zapisujemy jej najczęstszą postać.
			</p>
		{:else}
			<p class="what">
				We transcribe the <strong>Roman</strong> (ecclesiastical, “Italianate”) pronunciation — the one
				the Gregorian scholas use when they sing from the 1962 books. Under Saint Pius&nbsp;X, Rome encouraged
				the whole Church toward the Roman pronunciation. National traditions, the Polish one among them,
				survive in parishes, and the table below shows both. The Polish tradition is not uniform either
				— it varies by region and generation, and the transcriptions give its most common form.
			</p>
			<p class="what">
				Syllable division is identical in both traditions — chant gives each syllable its own note,
				so “grá-ti-a” has three syllables everywhere. In ordinary speech Polish contracts “-tia” to
				one syllable (“gracja”), and our transcriptions keep the sung division.
			</p>
		{/if}

		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'reguły' : 'the rules'}</h2>
			<!-- The roles are written out although they are the elements' own:
			     the stacked narrow layout sets display:block on all of them,
			     and a table whose display is not table-anything LOSES its
			     table semantics in the accessibility tree — precisely on the
			     large-print phone the breakpoint exists for. Explicit roles
			     survive any display. -->
			<div class="table-wrap">
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<table class="rules" role="table">
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<thead role="rowgroup">
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr role="row">
							<th role="columnheader" lang="la">littera</th>
							<th role="columnheader">{cols.roman}</th>
							<th role="columnheader">{cols.polish}</th>
							<th role="columnheader">{cols.example}</th>
						</tr>
					</thead>
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tbody role="rowgroup">
						{#each rules as r (r.grapheme)}
							<!-- svelte-ignore a11y_no_redundant_roles -->
							<tr role="row">
								<td role="cell" lang="la">{r.grapheme}</td>
								<td role="cell" data-label={cols.roman}>{r.roman}</td>
								<td role="cell" data-label={cols.polish}>{r.polish}</td>
								<td role="cell" data-label={cols.example}>
									{#if r.href}
										<a lang="la" href="/app/{lang}{r.href}">{r.example}</a>
									{:else}
										<span lang="la">{r.example}</span>
									{/if}
									<span class="ipa">{r.exampleIpa[lang]}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="fine">
				{lang === 'pl'
					? 'Reguła „ti” nie działa po s, t, x ani na początku wyrazu (hóstia: /ˈɔ.sti.a/). S między samogłoskami dźwięcznieje w\u00a0obu tradycjach (Iesus). Spółgłoskowe „i” nie jest osobną sylabą: Ie-sus ma dwie, ma-ie-stá-tis cztery. Starsze mszaliki drukują w\u00a0tym miejscu j (Jesus, majestátis) — to ta sama głoska. Pozostałe litery czyta się jak po polsku.'
					: 'The “ti” rule does not apply after s, t, x, or at the start of a word (hóstia: /ˈɔ.sti.a/). S between vowels is voiced in both traditions (Iesus). Consonantal i is not a syllable of its own: Ie-sus has two, ma-ie-stá-tis four. Older hand missals print j here (Jesus, majestátis) for the same sound. Other letters keep the Latin values of the symbols table.'}
			</p>
		</section>

		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'symbole' : 'the symbols'}</h2>
			<div class="table-wrap">
				<table>
					<tbody>
						{#each symbols as row (row.s)}
							<tr>
								<td class="sym" lang="und-fonipa">{row.s}</td>
								<td>{lang === 'pl' ? row.pl : row.en}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</main>
</div>

<style>
	.latin-name {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-size: 1.05rem;
	}

	.what {
		margin: 1.4rem auto 0;
		font-size: 1.05rem;
		line-height: 1.6;
	}

	/* The tables are rows, not sentences: they take the frame, as the
	   concordance and the card indexes do. */
	section {
		margin: 2.4rem auto 0;
	}

	.table-wrap {
		/* a container, so the rule table can lay itself out by the room it
		   actually has — which the reading size changes as much as the
		   window does */
		container-type: inline-size;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.98rem;
	}

	th {
		text-align: left;
		font-weight: 500;
		color: var(--ink-soft);
		font-size: 0.85rem;
		padding: 0.35rem 0.6rem;
		border-bottom: 1px solid var(--border);
	}

	td {
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}

	td a {
		color: inherit;
		border-bottom: 1px dotted var(--rubric);
		text-decoration: none;
	}

	td a:hover {
		color: var(--rubric);
	}

	.ipa {
		display: block;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.sym {
		white-space: nowrap;
		font-weight: 500;
	}

	/* THE RULES, WHERE FOUR COLUMNS WILL NOT FIT. The table wants 16.9rem
	   of room — the letter, two pronunciations, and an example with its
	   transcription, which cannot break inside a slash. A 320px phone
	   offers 17rem of column at the default reading size, 13.7rem at the
	   middle one and 11.3rem at the largest, so from the middle size up it
	   kept the example column off the screen behind a bar no phone draws,
	   and the cell wrapping out there stretched the visible rows around 150
	   pixels of nothing. Each rule stands as its own block instead, its
	   columns named in the margin, and every letter of it is on the screen.
	   The threshold is in rem, so it answers the reading size as well as the
	   window, and it stands at 18rem rather than 17: a table that fits by
	   one pixel does not fit. */
	@container (max-width: 18rem) {
		.rules thead {
			display: none;
		}

		.rules,
		.rules tbody,
		.rules tr,
		.rules td {
			display: block;
		}

		.rules tr {
			padding: 0.55rem 0;
			border-bottom: 1px solid var(--border);
		}

		.rules td {
			padding: 0;
			border: 0;
		}

		.rules td:first-child {
			margin-bottom: 0.25rem;
			font-weight: 500;
		}

		/* The column's name beside its value, in the margin the letter
		   above stands in: three transcriptions in a row say nothing
		   about which tradition each belongs to. */
		.rules td[data-label] {
			position: relative;
			padding-inline-start: 5.5rem;
		}

		.rules td[data-label]::before {
			content: attr(data-label);
			position: absolute;
			inset-inline-start: 0;
			color: var(--ink-soft);
			font-size: 0.85rem;
		}

		/* The example takes the whole block and wears its name over it
		   instead of beside it. In the margin's column it had 130px, and a
		   transcription broke inside its own slashes there — "…ta.tsi" on
		   one line and "ˈɔ.nɛ/" on the next, the stress mark parted from
		   the syllable it marks, which is the one break a pronunciation
		   page may not print. Nothing breaks at the full width. */
		.rules td:last-child {
			padding-inline-start: 0;
		}

		.rules td:last-child::before {
			position: static;
			display: block;
		}
	}

	.fine {
		margin: 0.8rem 0 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
</style>

<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindPlFields } from '$lib/polish';
	import { PRONUNCIATION_RULES as rules } from '$lib/pronuntiatio-rules';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const pageTitle = $derived(lang === 'pl' ? 'Wymowa' : 'Pronunciation');

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
			pl: 'jak k w „kot” i g w „góra”',
			en: 'as k in kind and g in go'
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
			s: 'kw gw',
			pl: 'jak k lub g z następującym po nim polskim ł',
			en: 'as qu in quick and gw in Gwen'
		},
		{
			s: 'kv gv',
			pl: 'k lub g z następującym po nim polskim w',
			en: 'k or g followed by v as in vine'
		},
		{ s: 'ˈ', pl: 'akcent — pada na następną sylabę', en: 'stress — falls on the next syllable' },
		{ s: '.', pl: 'granica sylaby', en: 'syllable boundary' }
	]);
</script>

<svelte:head>
	<title>{pageTitle} — Scrutabor</title>
	<meta name="description" content={msgs.pronunciationDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} parent="/app/{lang}/grammatica" parentLabel={msgs.grammarPageTitle} />

	<main>
		<h1 class="minor">{pageTitle}</h1>
		<p class="latin-name" lang="la">pronuntiatio</p>

		{#if lang === 'pl'}
			<p class="what">
				W&nbsp;kartach słów podajemy wymowę <strong>rzymską</strong>. W&nbsp;polskiej wersji
				modlitewnika przy niektórych słowach zobaczysz też wymowę polską. Obie wersje oznaczamy
				skrótami
				<span class="smallcaps">rz.</span>
				(rzymska) i&nbsp;<span class="smallcaps">pol.</span>
				(polska). Poniższa tabela zestawia oba warianty.
			</p>
			<p class="what">
				Kolumna „polska” pokazuje jedną z&nbsp;tradycyjnych odmian wymowy łaciny w&nbsp;Polsce.
				W&nbsp;obu transkrypcjach zachowujemy rozdzielne samogłoski w&nbsp;wyrazach takich jak
				„grá-ti-a” — trzy sylaby, inaczej niż w&nbsp;polskim słowie „gracja”. Podział na sylaby
				wskazuje sposób odczytania słowa, nie liczbę nut w&nbsp;śpiewie.
			</p>
		{:else}
			<p class="what">
				The word cards show <strong>Roman</strong> pronunciation. In the Polish edition, cards that
				give both pronunciations use the labels
				<span class="smallcaps">rz.</span>
				(Roman) and <span class="smallcaps">pol.</span>
				(Polish). The table below compares the two readings.
			</p>
			<p class="what">
				The Polish column gives one traditional pronunciation used in Poland. Both transcriptions
				keep adjacent vowels separate in words such as “grá-ti-a”: three syllables, unlike the
				Polish word “gracja”. Syllable divisions guide the reading of the word. They do not specify
				how many notes it has in chant.
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
							<th role="columnheader"
								>{lang === 'pl' ? 'litera lub grupa liter' : 'letter or combination'}</th
							>
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
								<td role="cell" lang={r.label ? lang : 'la'}>{r.label?.[lang] ?? r.grapheme}</td>
								<td role="cell" data-label={cols.roman}
									>{r.roman ?? (lang === 'pl' ? 'zwykle nieme' : 'usually silent')}</td
								>
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
			{#if lang === 'pl'}
				<p class="fine">
					Na początku wyrazu oraz po s, t lub x grupa ti przed samogłoską zachowuje wymowę /ti/, jak
					w&nbsp;hóstia. W&nbsp;słowie <a
						href="/app/{lang}/ordinarium/offerimus-tibi?w=w018"
						lang="la">totíus</a
					>
					również słychać /ti/. W&nbsp;wymowie rzymskiej h jest zwykle nieme. W&nbsp;słowach
					<a href="/app/{lang}/ordinarium/quid-retribuam?w=w008" lang="la">mihi</a>
					i&nbsp;<a
						href="/app/{lang}/formularium/omnium-sanctorum?w=omnium-sanctorum-graduale.w007"
						lang="la">nihil</a
					>
					oraz w&nbsp;wyrazach od nich pochodnych brzmi jak /k/.
				</p>
				<p class="fine">
					Spółgłoskowe i&nbsp;łączy się z&nbsp;następną samogłoską. Ie-sus ma dwie sylaby,
					a&nbsp;ma-ie-stá-tis cztery. W&nbsp;starszych mszalikach tę samą głoskę oznacza również
					litera j (Jesus, majestátis). W&nbsp;tej tabeli pojedyncze s między samogłoskami
					zapisujemy jako /z/. W&nbsp;wybranej tu polskiej wymowie ch brzmi jak w&nbsp;słowie
					„chór”.
				</p>
			{:else}
				<p class="fine">
					At the start of a word and after s, t, or x, ti before a vowel keeps the sound /ti/, as in
					hóstia. The same /ti/ is heard in
					<a href="/app/{lang}/ordinarium/offerimus-tibi?w=w018" lang="la">totíus</a>. In Roman
					pronunciation h is usually silent. In
					<a href="/app/{lang}/ordinarium/quid-retribuam?w=w008" lang="la">mihi</a> and
					<a
						href="/app/{lang}/formularium/omnium-sanctorum?w=omnium-sanctorum-graduale.w007"
						lang="la">nihil</a
					>
					and words derived from them, it sounds like /k/.
				</p>
				<p class="fine">
					Consonantal i joins the following vowel. Ie-sus has two syllables and ma-ie-stá-tis has
					four. Older hand missals also use j for the same sound (Jesus, majestátis). Here we
					transcribe a single s between vowels as /z/. The Polish column gives ch as /x/, as in
					Scots loch.
				</p>
			{/if}
		</section>

		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'symbole' : 'the symbols'}</h2>
			<p class="fine">
				{lang === 'pl'
					? 'Polskie przykłady podpowiadają, jak czytać zapis wymowy.'
					: 'The examples below give approximate English equivalents for the sounds in the transcriptions.'}
			</p>
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

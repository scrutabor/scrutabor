<script lang="ts">
	import { page } from '$app/state';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);

	// Rule rows: grapheme, Roman, Polish, example (corpus deep link when we
	// have one). Kept as data so the table stays honest and greppable.
	interface Rule {
		grapheme: string;
		roman: string;
		polish: string;
		example: string;
		exampleIpa: Record<'pl' | 'en', string>;
		href?: string;
	}

	const rules: Rule[] = [
		{
			grapheme: 'c + e, i, æ, œ, y',
			roman: '/tʃ/',
			polish: '/ts/',
			example: 'cælis',
			exampleIpa: { pl: 'rz. /ˈtʃɛ.lis/ · pol. /ˈtsɛ.lis/', en: '/ˈtʃɛ.lis/' },
			href: '/orationes/pater-noster?w=w006'
		},
		{
			grapheme: 'g + e, i, æ, œ, y',
			roman: '/dʒ/',
			polish: '/g/',
			example: 'cogitatióne',
			exampleIpa: {
				pl: 'rz. /kɔ.dʒi.ta.tsiˈɔ.nɛ/ · pol. /kɔ.gi.ta.tsiˈɔ.nɛ/',
				en: '/kɔ.dʒi.ta.tsiˈɔ.nɛ/'
			},
			href: '/ordinarium/confiteor?w=w027'
		},
		{
			grapheme: 'sc + e, i, æ, œ, y',
			roman: '/ʃ/',
			polish: '/sts/',
			example: 'ascéndit',
			exampleIpa: { pl: 'rz. /aˈʃɛn.dit/ · pol. /aˈstsɛn.dit/', en: '/aˈʃɛn.dit/' }
		},
		{
			grapheme: 'ti + vocalis',
			roman: '/tsi/',
			polish: '/tsi/',
			example: 'grátia',
			exampleIpa: { pl: '/ˈgra.tsi.a/', en: '/ˈgra.tsi.a/' },
			href: '/orationes/ave-maria?w=w003'
		},
		{
			grapheme: 'h',
			roman: '—',
			polish: '/x/',
			example: 'hódie',
			exampleIpa: { pl: 'rz. /ˈɔ.di.ɛ/ · pol. /ˈxɔ.di.ɛ/', en: '/ˈɔ.di.ɛ/' },
			href: '/orationes/pater-noster?w=w027'
		},
		{
			grapheme: 'qu',
			roman: '/kw/',
			polish: '/kv/',
			example: 'qui',
			exampleIpa: { pl: 'rz. /kwi/ · pol. /kvi/', en: '/kwi/' },
			href: '/orationes/pater-noster?w=w003'
		},
		{
			grapheme: 'gn',
			roman: '/ɲ/',
			polish: '/gn/',
			example: 'Agnus',
			exampleIpa: { pl: 'rz. /ˈa.ɲus/ · pol. /ˈa.gnus/', en: '/ˈa.ɲus/' }
		},
		{
			grapheme: 'xc + e, i, æ, œ, y',
			roman: '/kʃ/',
			polish: '/ksts/',
			example: 'excélsis',
			exampleIpa: { pl: 'rz. /ɛkˈʃɛl.sis/ · pol. /ɛksˈtsɛl.sis/', en: '/ɛkˈʃɛl.sis/' }
		},
		{
			grapheme: 's (inter vocales)',
			roman: '/z/',
			polish: '/z/',
			example: 'Jesus',
			exampleIpa: { pl: '/ˈjɛ.zus/', en: '/ˈjɛ.zus/' },
			href: '/orationes/ave-maria?w=w016'
		},
		{
			grapheme: 'æ, œ',
			roman: '/ɛ/',
			polish: '/ɛ/',
			example: 'sǽcula',
			exampleIpa: { pl: '/ˈsɛ.ku.la/', en: '/ˈsɛ.ku.la/' },
			href: '/orationes/gloria-patri?w=w018'
		},
		{
			grapheme: 'z',
			roman: '/dz/',
			polish: '/z/',
			example: 'Lázare',
			exampleIpa: { pl: 'rz. /ˈla.dza.rɛ/ · pol. /ˈla.za.rɛ/', en: '/ˈla.dza.rɛ/' }
		}
	];

	// The ~20 symbols a reader meets, each with an anchor word.
	const symbols: { s: string; pl: string; en: string }[] = [
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
		{ s: 's z v r', pl: 'jak s, z, w, r (r drżące)', en: 'as in sit, zeal, vine; r is rolled' },
		{
			s: 'kw kv gw',
			pl: 'jak kw w „kwiat”; gw jak w „gwiazda”',
			en: 'as qu in quick; gw as in Gwen'
		},
		{ s: 'ˈ', pl: 'akcent — pada na następną sylabę', en: 'stress — falls on the next syllable' },
		{ s: '.', pl: 'granica sylaby', en: 'syllable boundary' }
	];
</script>

<svelte:head>
	<title>{lang === 'pl' ? 'wymowa' : 'pronunciation'} — Scrutabor</title>
</svelte:head>

<div class="page">
	<nav>
		<a href="/{lang}/grammatica" class="back smallcaps">{msgs.grammarTitle}</a>
		<div class="nav-right">
			<LangMenu {lang} />
			<ThemeToggle {lang} />
		</div>
	</nav>

	<main>
		<h1>{lang === 'pl' ? 'wymowa' : 'pronunciation'}</h1>
		<p class="latin-name" lang="la">pronuntiatio</p>

		{#if lang === 'pl'}
			<p class="what">
				Transkrybujemy wymowę <strong>rzymską</strong> (kościelną, „włoską”) — tę, którą śpiewają
				księgi z 1962 roku i schole gregoriańskie — a tam, gdzie polska tradycja parafialna różni
				się od rzymskiej, pokazujemy obie: <span class="smallcaps">rz.</span>
				(rzymska) i <span class="smallcaps">pol.</span> (polska). Za świętego Piusa X Rzym zachęcał cały
				Kościół do wymowy rzymskiej, ale tradycje narodowe — w tym polska — przetrwały w parafiach i obie
				są dziś w użyciu.
			</p>
			<p class="what">
				Podział na sylaby jest w obu tradycjach ten sam — w śpiewie każda sylaba dostaje swoją nutę
				i „grá-ti-a” ma trzy sylaby w Rzymie i w Polsce. W mowie potocznej polszczyzna ściąga „-tia”
				do jednej sylaby („gracja”); nasze transkrypcje zachowują podział śpiewany. Polska tradycja
				nie jest też jednolita — różni się między regionami i pokoleniami; zapisujemy jej
				najczęstszą postać.
			</p>
		{:else}
			<p class="what">
				We transcribe the <strong>Roman</strong> (ecclesiastical, “Italianate”) pronunciation — the one
				the 1962 books are sung in by Gregorian scholas. Under saint Pius X, Rome encouraged the whole
				Church toward the Roman pronunciation; national traditions (the Polish one among them) survive
				in parishes, and the Polish interface of this app shows both where they differ.
			</p>
			<p class="what">
				Syllable division is identical in every tradition — chant gives each syllable its own note,
				so “grá-ti-a” has three syllables everywhere. Spoken habits may contract; our transcriptions
				keep the sung division.
			</p>
		{/if}

		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'reguły' : 'the rules'}</h2>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th lang="la">littera</th>
							<th>{lang === 'pl' ? 'rzymska' : 'Roman'}</th>
							<th>{lang === 'pl' ? 'polska' : 'Polish'}</th>
							<th>{lang === 'pl' ? 'przykład' : 'example'}</th>
						</tr>
					</thead>
					<tbody>
						{#each rules as r (r.grapheme)}
							<tr>
								<td lang="la">{r.grapheme}</td>
								<td>{r.roman}</td>
								<td>{r.polish}</td>
								<td>
									{#if r.href}
										<a lang="la" href="/{lang}{r.href}">{r.example}</a>
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
					? 'Reguła „ti” nie działa po s, t, x ani na początku wyrazu (hóstia: /ˈɔ.sti.a/). S między samogłoskami dźwięcznieje w obu tradycjach (Jesus); pozostałe litery czyta się jak po polsku.'
					: 'The “ti” rule does not apply after s, t, x, or at the start of a word (hóstia: /ˈɔ.sti.a/). S between vowels is voiced in both traditions (Jesus); other letters keep the Latin values of the symbols table — j is always /j/, never as in “joy”.'}
			</p>
		</section>

		<section>
			<h2 class="smallcaps">{lang === 'pl' ? 'symbole' : 'the symbols'}</h2>
			<div class="table-wrap">
				<table>
					<tbody>
						{#each symbols as row (row.s)}
							<tr>
								<td class="sym">{row.s}</td>
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
	.page {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	h1 {
		margin: 1.8rem 0 0;
		font-size: 2.2rem;
		font-weight: 500;
		text-align: center;
	}

	.latin-name {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
	}

	.what {
		margin: 1.4rem auto 0;
		max-width: 32rem;
		font-size: 1.05rem;
		line-height: 1.6;
	}

	section {
		margin: 2.4rem auto 0;
		max-width: 34rem;
	}

	h2 {
		margin: 0 0 0.9rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--rubric);
		text-align: center;
	}

	.table-wrap {
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

	.fine {
		margin: 0.8rem 0 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.5;
	}
</style>

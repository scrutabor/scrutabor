// Navigation catalog: which texts exist and how they group. Content itself
// lives in the corpus data (lib/data); this file only orders and labels it.
import type { Lang } from './i18n';
import { bindPlFields } from './polish';

export interface CatalogText {
	category: string;
	slug: string;
	title: string;
	localizedTitle: Record<Lang, string>;
}

export interface CatalogSection {
	category: string;
	label: Record<Lang, string>;
	texts: CatalogText[];
}

const CATALOG_SOURCE: CatalogSection[] = [
	{
		category: 'orationes',
		label: { pl: 'modlitwy', en: 'prayers' },
		texts: [
			{
				category: 'orationes',
				slug: 'pater-noster',
				title: 'Pater noster',
				localizedTitle: { pl: 'Ojcze nasz', en: 'Our Father' }
			},
			{
				category: 'orationes',
				slug: 'ave-maria',
				title: 'Ave María',
				localizedTitle: { pl: 'Zdrowaś Maryjo', en: 'Hail Mary' }
			},
			{
				category: 'orationes',
				slug: 'gloria-patri',
				title: 'Glória Patri',
				localizedTitle: { pl: 'Chwała Ojcu', en: 'Glory Be' }
			},
			{
				category: 'orationes',
				slug: 'signum-crucis',
				title: 'Signum crucis',
				localizedTitle: { pl: 'Znak krzyża', en: 'Sign of the Cross' }
			},
			{
				category: 'orationes',
				slug: 'symbolum-apostolorum',
				title: 'Symbolum Apostolórum',
				localizedTitle: { pl: 'Skład Apostolski', en: 'Apostles’ Creed' }
			},
			{
				category: 'orationes',
				slug: 'memorare',
				title: 'Memoráre',
				localizedTitle: { pl: 'Pomnij, o Najświętsza Panno Maryjo', en: 'Memorare' }
			},
			{
				category: 'orationes',
				slug: 'magnificat',
				title: 'Magníficat',
				localizedTitle: { pl: 'Magnificat (Pieśń Maryi)', en: 'The Magnificat' }
			},
			{
				category: 'orationes',
				slug: 'anima-christi',
				title: 'Ánima Christi',
				localizedTitle: { pl: 'Duszo Chrystusowa', en: 'Soul of Christ' }
			},
			{
				category: 'orationes',
				slug: 'actus-contritionis',
				title: 'Actus contritiónis',
				localizedTitle: { pl: 'Akt żalu', en: 'Act of Contrition' }
			},
			{
				category: 'orationes',
				slug: 'angele-dei',
				title: 'Ángele Dei',
				localizedTitle: { pl: 'Aniele Boży', en: 'Angel of God' }
			},
			{
				category: 'orationes',
				slug: 'benedic-domine',
				title: 'Bénedic, Dómine',
				localizedTitle: { pl: 'Błogosławieństwo posiłku', en: 'Meal Blessing' }
			},
			{
				category: 'orationes',
				slug: 'agimus-tibi-gratias',
				title: 'Ágimus tibi grátias',
				localizedTitle: { pl: 'Dziękczynienie', en: 'Thanksgiving' }
			},
			{
				category: 'orationes',
				slug: 'alma-redemptoris-mater',
				title: 'Alma Redemptóris Mater',
				localizedTitle: { pl: 'Alma Redemptoris Mater', en: 'Alma Redemptoris Mater' }
			},
			{
				category: 'orationes',
				slug: 'angelus-domini',
				title: 'Ángelus Dómini',
				localizedTitle: { pl: 'Anioł Pański', en: 'The Angelus' }
			},
			{
				category: 'orationes',
				slug: 'sub-tuum-praesidium',
				title: 'Sub tuum præsídium',
				localizedTitle: { pl: 'Pod Twoją obronę', en: 'We Fly to Thy Protection' }
			},
			{
				category: 'orationes',
				slug: 'salve-regina',
				title: 'Salve Regína',
				localizedTitle: { pl: 'Witaj, Królowo', en: 'Hail, Holy Queen' }
			},
			{
				category: 'orationes',
				slug: 'regina-caeli',
				title: 'Regína cæli',
				localizedTitle: { pl: 'Królowo nieba', en: 'Queen of Heaven' }
			},
			{
				category: 'orationes',
				slug: 'sancte-michael',
				title: 'Sancte Míchaël',
				localizedTitle: {
					pl: 'Święty Michale Archaniele',
					en: 'Saint Michael the Archangel'
				}
			}
		]
	},
	{
		category: 'defunctorum',
		label: { pl: 'za zmarłych', en: 'for the dead' },
		texts: [
			{
				category: 'defunctorum',
				slug: 'requiem-aeternam',
				title: 'Réquiem ætérnam',
				localizedTitle: { pl: 'Wieczny odpoczynek', en: 'Eternal Rest' }
			},
			{
				category: 'defunctorum',
				slug: 'de-profundis',
				title: 'De profúndis',
				localizedTitle: { pl: 'Z głębokości', en: 'Out of the Depths' }
			}
		]
	},
	{
		category: 'litaniae',
		label: { pl: 'litanie', en: 'litanies' },
		texts: [
			{
				category: 'litaniae',
				slug: 'lauretanae',
				title: 'Litániæ Lauretanæ',
				localizedTitle: { pl: 'Litania loretańska', en: 'Litany of Loreto' }
			},
			{
				category: 'litaniae',
				slug: 'sacratissimi-cordis-iesu',
				title: 'Litániæ Sacratíssimi Cordis Iesu',
				localizedTitle: {
					pl: 'Litania do Najświętszego Serca Pana Jezusa',
					en: 'Litany of the Most Sacred Heart of Jesus'
				}
			},
			{
				category: 'litaniae',
				slug: 'sanctissimi-nominis-iesu',
				title: 'Litániæ Sanctíssimi Nóminis Iesu',
				localizedTitle: {
					pl: 'Litania do Najświętszego Imienia Jezus',
					en: 'Litany of the Most Holy Name of Jesus'
				}
			}
		]
	},
	{
		category: 'ordinarium',
		label: { pl: 'ordinarium missæ', en: 'ordinarium missæ' },
		texts: [
			{
				category: 'ordinarium',
				slug: 'confiteor',
				title: 'Confíteor (Ministrórum)',
				localizedTitle: { pl: 'Spowiadam się', en: 'I Confess' }
			},
			{
				category: 'ordinarium',
				slug: 'kyrie',
				title: 'Kýrie, eléison',
				localizedTitle: { pl: 'Panie, zmiłuj się', en: 'Lord, Have Mercy' }
			},
			{
				category: 'ordinarium',
				slug: 'gloria',
				title: 'Glória in excélsis',
				localizedTitle: { pl: 'Chwała na wysokości Bogu', en: 'Glory to God in the Highest' }
			},
			{
				category: 'ordinarium',
				slug: 'credo',
				title: 'Credo',
				localizedTitle: { pl: 'Wierzę w jednego Boga', en: 'I Believe in One God' }
			},
			{
				category: 'ordinarium',
				slug: 'sanctus',
				title: 'Sanctus',
				localizedTitle: { pl: 'Święty, Święty, Święty', en: 'Holy, Holy, Holy' }
			},
			{
				category: 'ordinarium',
				slug: 'agnus-dei',
				title: 'Agnus Dei',
				localizedTitle: { pl: 'Baranku Boży', en: 'Lamb of God' }
			}
		]
	},
	{
		// DECLARED AND EMPTY, on purpose (owner, 2026-08-18). The ten Advent
		// parts were briefly listed here as ten cards, which read fine for one
		// Sunday and would be five hundred cards for the year. Listing days is
		// not the answer either: the reader's question is "what is prayed
		// today", and the Ordo already carries a slot for every proper part,
		// labelled *z formularza dnia*. Those slots get filled from a day the
		// reader picks, and no menu grows at all.
		//
		// Until that lands the Proper has NO menu entry. It is not orphaned:
		// 489 lemma pages link into it, and every part keeps its own crawlable
		// page. The section survives without texts because it still names the
		// group — a reading reached by a direct link falls back to this label
		// rather than to nothing — and because an empty declaration says the
		// absence was chosen, where a deleted one would say nobody thought
		// about it. `catalog.reach.test.ts` holds the same decision from the
		// other side.
		category: 'proprium',
		label: { pl: 'z formularza dnia', en: 'from the day’s formulary' },
		texts: []
	},
	{
		// The first shelf that is not the Mass. Psalm 118 is an acrostic of
		// twenty-two stanzas, one per Hebrew letter, so a stanza is the unit
		// and not the psalm — and this one is here first because verse 34 of
		// it is the verse this edition is named from.
		category: 'psalmi',
		label: { pl: 'psalmy', en: 'psalms' },
		texts: [
			{
				category: 'psalmi',
				slug: '118-he',
				title: 'Psalmus 118, HE',
				localizedTitle: { pl: 'Doskonałość Prawa Bożego', en: 'The Perfection of God’s Law' }
			}
		]
	}
];

/** Polish one-letter words bound to what follows (lib/polish); Latin
 * titles and English prose in the same objects are untouched. */
export const CATALOG: CatalogSection[] = bindPlFields(CATALOG_SOURCE);

export function sectionFor(category: string): CatalogSection | undefined {
	return CATALOG.find((s) => s.category === category);
}

/** The familiar localized name belongs to the individual reading, unlike
 * the section label ("prayers", "psalms"), which only names its shelf. */
export function textFor(category: string, slug: string): CatalogText | undefined {
	return sectionFor(category)?.texts.find((text) => text.slug === slug);
}

/** The book's reading order: catalog sections flattened — within
 * ordinarium this IS the liturgical sequence, which the pager relies on. */
export function orderedTexts(): CatalogText[] {
	return CATALOG.flatMap((s) => s.texts);
}

export function neighborsOf(
	category: string,
	slug: string
): { prev?: CatalogText; next?: CatalogText } {
	const all = orderedTexts();
	const i = all.findIndex((t) => t.category === category && t.slug === slug);
	if (i < 0) return {};
	return { prev: all[i - 1], next: all[i + 1] };
}

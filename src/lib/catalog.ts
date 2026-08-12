// Navigation catalog: which texts exist and how they group. Content itself
// lives in the corpus data (lib/data); this file only orders and labels it.
import type { Lang } from './i18n';
import { bindPlFields } from './polish';

export interface CatalogText {
	category: string;
	slug: string;
	title: string;
	note: Record<Lang, string>;
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
				note: { pl: 'Modlitwa Pańska', en: "the Lord's Prayer" }
			},
			{
				category: 'orationes',
				slug: 'ave-maria',
				title: 'Ave María',
				note: { pl: 'Pozdrowienie anielskie', en: 'the Hail Mary' }
			},
			{
				category: 'orationes',
				slug: 'gloria-patri',
				title: 'Glória Patri',
				note: { pl: 'doksologia mniejsza', en: 'the lesser doxology' }
			},
			{
				category: 'orationes',
				slug: 'angelus-domini',
				title: 'Ángelus Dómini',
				note: {
					pl: 'Anioł Pański, poza okresem wielkanocnym',
					en: 'the Angelus, outside Paschaltide'
				}
			},
			{
				category: 'orationes',
				slug: 'sub-tuum-praesidium',
				title: 'Sub tuum præsídium',
				note: { pl: 'Pod Twoją obronę', en: 'Under Your Protection' }
			},
			{
				category: 'orationes',
				slug: 'salve-regina',
				title: 'Salve Regína',
				note: { pl: 'antyfona maryjna, po Mszy cichej', en: 'the Marian antiphon, after low Mass' }
			},
			{
				category: 'orationes',
				slug: 'regina-caeli',
				title: 'Regína cæli',
				note: {
					pl: 'antyfona maryjna okresu wielkanocnego',
					en: 'the Marian antiphon of Paschaltide'
				}
			},
			{
				category: 'orationes',
				slug: 'sancte-michael',
				title: 'Sancte Míchaël',
				note: {
					pl: 'modlitwa do świętego Michała Archanioła',
					en: 'the prayer to St Michael the Archangel'
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
				note: { pl: 'spowiedź powszechna', en: 'the general confession' }
			},
			{
				category: 'ordinarium',
				slug: 'kyrie',
				title: 'Kýrie, eléison',
				note: { pl: 'wezwania o zmiłowanie', en: 'the plea for mercy' }
			},
			{
				category: 'ordinarium',
				slug: 'gloria',
				title: 'Glória in excélsis',
				note: { pl: 'hymn anielski', en: 'the angelic hymn' }
			},
			{
				category: 'ordinarium',
				slug: 'credo',
				title: 'Credo',
				note: { pl: 'wyznanie wiary', en: 'the profession of faith' }
			},
			{
				category: 'ordinarium',
				slug: 'sanctus',
				title: 'Sanctus',
				note: { pl: 'przed Kanonem', en: 'before the Canon' }
			},
			{
				category: 'ordinarium',
				slug: 'agnus-dei',
				title: 'Agnus Dei',
				note: { pl: 'przed Komunią', en: 'before Communion' }
			}
		]
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
				note: { pl: 'wersety 33-40, z mottem', en: 'verses 33-40, with the motto' }
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

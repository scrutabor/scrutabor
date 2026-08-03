// Navigation catalog: which texts exist and how they group. Content itself
// lives in the corpus data (lib/data); this file only orders and labels it.
import type { Lang } from './i18n';

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

export const CATALOG: CatalogSection[] = [
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
				title: 'Confíteor',
				note: { pl: 'spowiedź powszechna', en: 'the general confession' }
			}
		]
	}
];

export function sectionFor(category: string): CatalogSection | undefined {
	return CATALOG.find((s) => s.category === category);
}

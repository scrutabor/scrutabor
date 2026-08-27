import type { Lang } from './i18n';

export interface CatalogSectionSource {
	category: string;
	label: Record<Lang, string>;
	/** Slugs in the book's editorial order. */
	texts: string[];
}

/** Navigation grouping and order, deliberately independent of corpus data. */
export const CATALOG_ORDER: CatalogSectionSource[] = [
	{
		category: 'orationes',
		label: { pl: 'modlitwy', en: 'prayers' },
		texts: [
			'pater-noster',
			'ave-maria',
			'gloria-patri',
			'signum-crucis',
			'symbolum-apostolorum',
			'memorare',
			'magnificat',
			'anima-christi',
			'actus-contritionis',
			'angele-dei',
			'benedic-domine',
			'agimus-tibi-gratias',
			'alma-redemptoris-mater',
			'ave-regina-caelorum',
			'te-deum',
			'angelus-domini',
			'sub-tuum-praesidium',
			'salve-regina',
			'regina-caeli',
			'sancte-michael'
		]
	},
	{
		category: 'defunctorum',
		label: { pl: 'za zmarłych', en: 'for the dead' },
		texts: ['requiem-aeternam', 'de-profundis']
	},
	{
		category: 'litaniae',
		label: { pl: 'litanie', en: 'litanies' },
		texts: ['lauretanae', 'sacratissimi-cordis-iesu', 'sanctissimi-nominis-iesu']
	},
	{
		category: 'ordinarium',
		label: { pl: 'ordinarium missæ', en: 'ordinarium missæ' },
		texts: ['confiteor', 'kyrie', 'gloria', 'credo', 'sanctus', 'agnus-dei']
	},
	{
		// Proper texts are reached from the Ordo. Keeping the empty declaration
		// gives direct reading routes a section label without creating hundreds
		// of catalogue cards as the calendar grows.
		category: 'proprium',
		label: { pl: 'z formularza dnia', en: 'from the day’s formulary' },
		texts: []
	},
	{
		category: 'psalmi',
		label: { pl: 'psalmy', en: 'psalms' },
		texts: ['118-he']
	}
];

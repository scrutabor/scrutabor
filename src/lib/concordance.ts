// Concordance: where each lemma occurs across the corpus. Derived from the
// vendored snapshot at module load — the corpus is small enough that the
// whole index costs less than one prayer's text.
//
// It is built from EVERY text, not from the catalogue. The catalogue orders
// a shelf of thirteen; the corpus holds sixty-one, and the concordance was
// reading the shelf — so the whole Canon, the offertory prayers, the
// ablutions and the last Gospel contributed nothing, and a reader tapping
// Dóminus was shown a fraction of its occurrences on a page that reads as
// though it were all of them. That is the same mistake as prerendering the
// catalogue instead of the corpus: the list a page renders
// from and the list of what exists are two different lists.
import { CATALOG } from './catalog';
import { PROPER_DAYS, partOf, properRank } from './proprium';
import { TEXTS } from './corpus';
import { ORDO } from './ordo';

export interface Occurrence {
	/** "category/slug" — the reading route params. */
	textKey: string;
	title: string;
	wordId: string;
	form: string;
}

export interface TextOccurrences {
	textKey: string;
	title: string;
	items: Occurrence[];
}

/**
 * Every text in the corpus, in the order a reader meets it: the shelf
 * first, then the Mass from the Ordo's own sequence, and last — sorted, so
 * the order is at least stable — anything neither of them names. That tail
 * should stay empty, and the test says so: a text nothing sequences is a
 * text nothing links to either.
 */
export function everyTextInOrder(): string[] {
	const seen = new Set<string>();
	const order: string[] = [];
	const add = (key: string) => {
		if (TEXTS[key] && !seen.has(key)) {
			seen.add(key);
			order.push(key);
		}
	};
	for (const section of CATALOG) for (const t of section.texts) add(`${t.category}/${t.slug}`);
	for (const movement of ORDO) for (const e of movement.entries) if (e.text) add(e.text);
	// The tail: anything neither shelf nor Ordo names. The Proper lives here
	// on purpose and must not arrive alphabetically — not its parts, which
	// would put an Alleluia before its Introit, and not its days, which
	// PROPER_DAYS already holds in the year's own order. Roman numerals
	// sorted as strings put Advent II before Easter II before Advent III;
	// they are right for i/ii/iii/iv alone, which is one season's luck.
	// The day id is the slug less its part suffix — exact, not a prefix
	// match, so a day whose id begins with another day's id cannot be
	// mistaken for it.
	const dayRank = (slug: string): number => {
		const part = partOf(slug);
		const day = part ? slug.slice(0, -(part.length + 1)) : slug;
		const at = PROPER_DAYS.findIndex((d) => d.id === day);
		return at === -1 ? PROPER_DAYS.length : at;
	};
	const tail = Object.keys(TEXTS).sort((a, b) => {
		const [ca, sa] = a.split('/');
		const [cb, sb] = b.split('/');
		if (ca === 'proprium' && cb === 'proprium') {
			const day = dayRank(sa) - dayRank(sb);
			return day !== 0 ? day : properRank(sa) - properRank(sb);
		}
		return a.localeCompare(b);
	});
	for (const key of tail) add(key);
	return order;
}

const INDEX = new Map<string, Occurrence[]>();

for (const key of everyTextInOrder()) {
	const entry = TEXTS[key];
	for (const seg of entry.text.segments) {
		for (const w of seg.words ?? []) {
			let list = INDEX.get(w.lemma);
			if (!list) INDEX.set(w.lemma, (list = []));
			list.push({ textKey: key, title: entry.text.title, wordId: w.id, form: w.form });
		}
	}
}

export function occurrencesOf(lemma: string): TextOccurrences[] {
	const grouped: TextOccurrences[] = [];
	for (const occ of INDEX.get(lemma) ?? []) {
		const last = grouped[grouped.length - 1];
		if (last && last.textKey === occ.textKey) {
			last.items.push(occ);
		} else {
			grouped.push({ textKey: occ.textKey, title: occ.title, items: [occ] });
		}
	}
	return grouped;
}

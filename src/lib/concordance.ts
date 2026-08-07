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
// catalogue instead of the corpus (quality.md): the list a page renders
// from and the list of what exists are two different lists.
import { CATALOG } from './catalog';
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
	for (const key of Object.keys(TEXTS).sort()) add(key);
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

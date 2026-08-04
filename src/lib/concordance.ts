// Concordance: where each lemma occurs across the corpus. Derived from the
// vendored snapshot at module load — the corpus is small enough that the
// whole index costs less than one prayer's text.
import { CATALOG } from './catalog';
import { TEXTS } from './corpus';

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

const INDEX = new Map<string, Occurrence[]>();

// Catalog order, not object order — the concordance reads as the reader
// meets the texts in the app.
for (const section of CATALOG) {
	for (const t of section.texts) {
		const key = `${t.category}/${t.slug}`;
		const entry = TEXTS[key];
		if (!entry) continue;
		for (const seg of entry.text.segments) {
			for (const w of seg.words ?? []) {
				let list = INDEX.get(w.lemma);
				if (!list) INDEX.set(w.lemma, (list = []));
				list.push({ textKey: key, title: entry.text.title, wordId: w.id, form: w.form });
			}
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

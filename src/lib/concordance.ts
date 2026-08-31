// Concordance: where each lemma and normalized Latin form occurs. The corpus
// emits the postings; this module resolves only the text files they name.
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
import { PROPER_DAYS, SLOT_OF, properRank } from './proprium';
import { TEXT_KEYS, hasText, loadCoreTexts } from './corpus';
import { ORDO } from './ordo';
import concordance from './data/concordance.json';

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

export interface ConcordanceAddress {
	textKey: string;
	segmentId: string;
	wordId: string;
	position: number;
}

export type LatinPosting = [number, string, string, number];
export interface ConcordanceData {
	schema_version: string;
	texts: (string | null)[];
	latin: {
		lemmata: Record<string, LatinPosting[]>;
		forms: Record<string, LatinPosting[]>;
	};
}

export const CONCORDANCE = concordance as unknown as ConcordanceData;

/** The same normalization the corpus uses when it emits form search keys:
 * decompose and strip marks first, expand ligatures second, so the
 * precomposed ǽ (U+01FD) expands like every plain æ. Tested against the
 * edition's own vectors in src/lib/data/normalization.json. */
export function normalizeLatin(value: string): string {
	return value
		.toLocaleLowerCase('la')
		.normalize('NFKD')
		.replaceAll(/\p{M}/gu, '')
		.replaceAll('æ', 'ae')
		.replaceAll('œ', 'oe');
}

function textKey(number: number): string | undefined {
	return CONCORDANCE.texts[number]?.replace('.', '/');
}

function candidateKeys(postings: LatinPosting[]): string[] {
	return [...new Set(postings.map(([number]) => textKey(number)).filter(Boolean))] as string[];
}

/** Stable word addresses for exact Latin-form results in a future search UI. */
export function addressesForLatinForm(form: string): ConcordanceAddress[] {
	return (CONCORDANCE.latin.forms[normalizeLatin(form)] ?? []).flatMap(
		([number, segmentId, wordId, position]) => {
			const key = textKey(number);
			return key ? [{ textKey: key, segmentId, wordId, position }] : [];
		}
	);
}

/** Candidate texts for a future Latin search, without opening any text. */
export function textsForLatinForm(form: string): string[] {
	return [...new Set(addressesForLatinForm(form).map(({ textKey: key }) => key))];
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
		if (hasText(key) && !seen.has(key)) {
			seen.add(key);
			order.push(key);
		}
	};
	for (const section of CATALOG) for (const t of section.texts) add(`${t.category}/${t.slug}`);
	for (const movement of ORDO) {
		for (const e of movement.entries) {
			if (e.kind === 'proper') {
				// Sequence shared texts at the slot where the rite uses them, in
				// the corpus's formulary order, instead of leaving them in the
				// alphabetical tail.
				for (const day of PROPER_DAYS) {
					for (const component of day.components) {
						if (SLOT_OF[component.role] === e.id && !component.text.startsWith('proprium/'))
							add(component.text);
					}
				}
			}
			if (e.text) add(e.text);
		}
	}
	// The tail: anything neither shelf nor Ordo names. The Proper lives here
	// on purpose and must not arrive alphabetically — not its parts, which
	// would put an Alleluia before its Introit, and not its days, which
	// PROPER_DAYS already holds in the year's own order. Roman numerals
	// sorted as strings put Advent II before Easter II before Advent III;
	// they are right for i/ii/iii/iv alone, which is one season's luck.
	// Ownership comes from the canonical component relation, not a filename.
	// A referenced chant belongs at its own formulary, not at the first later
	// Sunday that transfers it.
	const dayRank = (slug: string): number => {
		const key = `proprium/${slug}`;
		const proper = PROPER_DAYS.findIndex((day) =>
			day.components.some((component) => component.text === key && component.relation === 'proper')
		);
		if (proper !== -1) return proper;
		const referenced = PROPER_DAYS.findIndex((day) =>
			day.components.some((component) => component.text === key)
		);
		return referenced === -1 ? PROPER_DAYS.length : referenced;
	};
	const tail = [...TEXT_KEYS].sort((a, b) => {
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

export async function occurrencesOf(lemma: string): Promise<TextOccurrences[]> {
	const postings = CONCORDANCE.latin.lemmata[lemma] ?? [];
	const texts = await loadCoreTexts(candidateKeys(postings));
	const byText = new Map<string, string[]>();
	for (const posting of postings) {
		const [number, , wordId] = posting;
		const key = textKey(number);
		if (!key) continue;
		const ids = byText.get(key) ?? [];
		ids.push(wordId);
		byText.set(key, ids);
	}

	const grouped: TextOccurrences[] = [];
	for (const key of everyTextInOrder()) {
		const ids = byText.get(key);
		const entry = texts[key];
		if (!ids || !entry) continue;
		const wanted = new Set(ids);
		const words = entry.segments
			.flatMap((segment) => segment.words ?? [])
			.filter((word) => wanted.has(word.id));
		grouped.push({
			textKey: key,
			title: entry.title,
			items: words.map((word) => ({
				textKey: key,
				title: entry.title,
				wordId: word.id,
				form: word.form
			}))
		});
	}
	return grouped;
}

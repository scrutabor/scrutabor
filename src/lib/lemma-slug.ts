// One deterministic, case-safe address per lexicon entry.
//
// A lemma page is emitted as a file named by its address, and two lemmata
// that differ only in case — the proper noun Clemens beside the adjective
// clemens — collide on a case-insensitive disk: a macOS build wrote 1,137
// of 1,138 pages per language and served the adjective under the saint's
// name. The rule, general rather than a special case for that pair:
//
//   - a lemma whose casefolded form is UNIQUE keeps its authored form as
//     its address (every existing link keeps working);
//   - the members of a case-insensitive collision group take
//     `<lowercase>.<ordinal>`, ordinals by codepoint order of the authored
//     forms, so the set of emitted names is collision-free by construction.
import { LEXICON } from './corpus';

const fold = (lemma: string) => lemma.toLocaleLowerCase('la');

const GROUPS = new Map<string, string[]>();
for (const lemma of Object.keys(LEXICON.lemmata)) {
	const key = fold(lemma);
	GROUPS.set(key, [...(GROUPS.get(key) ?? []), lemma]);
}
for (const members of GROUPS.values()) {
	members.sort();
}

const SLUG_OF = new Map<string, string>();
const LEMMA_OF = new Map<string, string>();
for (const [key, members] of GROUPS) {
	if (members.length === 1) {
		SLUG_OF.set(members[0], members[0]);
		LEMMA_OF.set(members[0], members[0]);
	} else {
		members.forEach((lemma, index) => {
			const slug = `${key}.${index + 1}`;
			SLUG_OF.set(lemma, slug);
			LEMMA_OF.set(slug, lemma);
		});
	}
}

/** The address of a lexicon entry. */
export function lemmaSlug(lemma: string): string {
	return SLUG_OF.get(lemma) ?? lemma;
}

/** The lexicon entry an address names, or undefined for a stranger. */
export function lemmaOfSlug(slug: string): string | undefined {
	return LEMMA_OF.get(slug);
}

/** Every emitted address — the prerender enumeration. */
export function allLemmaSlugs(): string[] {
	return [...LEMMA_OF.keys()];
}

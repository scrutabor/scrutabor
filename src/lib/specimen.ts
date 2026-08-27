// The landing's specimen verse, chosen against the language package that
// will render it. The preferred verse is Psalm 118:34 — the He stanza the
// motto quotes and the app is named from — but a package is allowed to be
// partial, and a landing that error(500)s because one psalm is missing
// would make the namesake verse a hard dependency of every future
// language. The fallback walks the package's own texts and takes the
// first glossed verse; a package with nothing to show yields null and the
// landing simply renders without its specimen.
import type { GlossDocument, TextDocument } from './corpus';
import { textKeysFor } from './corpus-metadata';
import type { Lang } from './i18n';

export interface Specimen {
	doc: TextDocument;
	gloss: GlossDocument;
}

export const PREFERRED = { key: 'psalmi/118-he', verse: 's02' };

type Entry = { text: TextDocument; gloss: GlossDocument } | undefined;
type Loader = (key: string, lang: Lang) => Promise<Entry>;

function carve(entry: NonNullable<Entry>, verseId?: string): Specimen | null {
	const verse = verseId
		? entry.text.segments.find((segment) => segment.id === verseId)
		: entry.text.segments.find(
				(segment) =>
					segment.type === 'verse' &&
					(segment.words?.length ?? 0) > 0 &&
					entry.gloss.segments[segment.id] !== undefined
			);
	if (!verse || !verse.words?.length) return null;
	const verseGloss = entry.gloss.segments[verse.id];
	if (!verseGloss) return null;
	const ids = new Set(verse.words.map((word) => word.id));
	return {
		doc: { ...entry.text, segments: [verse] },
		gloss: {
			...entry.gloss,
			// the text's introduction belongs to its own page, not the landing
			about: undefined,
			about_citations: undefined,
			segments: { [verse.id]: verseGloss },
			words: Object.fromEntries(Object.entries(entry.gloss.words).filter(([id]) => ids.has(id)))
		}
	};
}

export async function pickSpecimen(lang: Lang, load: Loader): Promise<Specimen | null> {
	const preferred = await load(PREFERRED.key, lang);
	if (preferred) {
		const carved = carve(preferred, PREFERRED.verse);
		if (carved) return carved;
	}
	for (const key of textKeysFor(lang)) {
		if (key === PREFERRED.key) continue;
		const entry = await load(key, lang);
		if (!entry) continue;
		const carved = carve(entry);
		if (carved) return carved;
	}
	return null;
}

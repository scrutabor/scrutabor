import { LEXICON, type Citation, type SenseEntry, type TextEntry } from './corpus';
import type { Lang } from './i18n';

export interface BibliographyUse {
	title: string;
	href: string;
	/** How many notes in that text rest on this locator. One link is listed
	 * per text, because the exact backlink already stands beside every note —
	 * this page is the list of SOURCES, and the litany that cites one work at
	 * 146 words was rendering 146 identical links, 3,526 px of them on a
	 * phone. The count is what those 146 were actually saying. */
	notes: number;
}

/** What a caller hands in: where the note is. The counting is this module's. */
type Where = Omit<BibliographyUse, 'notes'>;

export interface BibliographyLocator {
	locator: string;
	url?: string;
	uses: BibliographyUse[];
}

export interface BibliographySource {
	title: string;
	locators: BibliographyLocator[];
}

interface MutableSource {
	title: string;
	locators: Map<string, BibliographyLocator>;
}

/**
 * Collect the sources which actually support reader-facing prose. Textual
 * witnesses and analyzer provenance belong to the critical apparatus and the
 * word panel respectively; this is deliberately the bibliography of notes,
 * not an indiscriminate list of everything used to make the edition.
 */
export function buildBibliography(
	lang: Lang,
	texts: Record<string, TextEntry>,
	senses: Record<string, SenseEntry>
): BibliographySource[] {
	const sources = new Map<string, MutableSource>();

	function add(citation: Citation, use: Where) {
		let source = sources.get(citation.title);
		if (!source) {
			source = { title: citation.title, locators: new Map() };
			sources.set(citation.title, source);
		}

		const locatorKey = `${citation.locator}\u0000${citation.url ?? ''}`;
		let locator = source.locators.get(locatorKey);
		if (!locator) {
			locator = { locator: citation.locator, url: citation.url, uses: [] };
			source.locators.set(locatorKey, locator);
		}
		// By TEXT, not by anchor. Every cited word inside one text produced its
		// own href and its own list entry, all reading the same title.
		const already = locator.uses.find((existing) => existing.title === use.title);
		if (already) already.notes += 1;
		else locator.uses.push({ ...use, notes: 1 });
	}

	for (const [key, entry] of Object.entries(texts)) {
		const gloss = entry.gloss;
		const textUse = { title: entry.text.title, href: `/app/${lang}/${key}` };
		const anchors = new Map(
			entry.text.segments.map((segment) => [
				segment.id,
				segment.verse === undefined ? segment.id : `v${segment.verse}`
			])
		);
		for (const citation of gloss.about_citations ?? []) add(citation, textUse);

		for (const [segmentId, segment] of Object.entries(gloss.segments)) {
			const href = `${textUse.href}#${anchors.get(segmentId) ?? segmentId}`;
			for (const citation of segment.narrative_citations ?? []) {
				add(citation, { ...textUse, href });
			}
			for (const citation of segment.translation_citations ?? []) {
				add(citation, { ...textUse, href });
			}
		}

		for (const [wordId, word] of Object.entries(gloss.words)) {
			for (const citation of word.explanation_citations ?? []) {
				add(citation, { ...textUse, href: `${textUse.href}?w=${wordId}` });
			}
		}
	}

	for (const [lemma, sense] of Object.entries(senses)) {
		for (const citation of sense.note_citations ?? []) {
			add(citation, {
				title: LEXICON.lemmata[lemma]?.head ?? lemma,
				href: `/app/${lang}/lemma/${encodeURIComponent(lemma)}`
			});
		}
	}

	// The collation is pinned to the page's own language: a bare
	// localeCompare reads the BUILD MACHINE's locale, and a prerendered
	// page's ordering must not depend on where it was built. (pl and en
	// agree on today's titles — the pin is so that staying equal is not
	// load-bearing.)
	const by = (a: string, b: string) => a.localeCompare(b, lang);
	return [...sources.values()]
		.map((source) => ({
			title: source.title,
			locators: [...source.locators.values()]
				.map((locator) => ({
					...locator,
					uses: locator.uses.sort((a, b) => by(a.title, b.title))
				}))
				.sort((a, b) => by(a.locator, b.locator))
		}))
		.sort((a, b) => by(a.title, b.title));
}

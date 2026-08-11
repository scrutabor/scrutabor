import { LEXICON, TEXTS, type Citation } from './corpus';
import type { Lang } from './i18n';

export interface BibliographyUse {
	title: string;
	href: string;
}

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
export function buildBibliography(lang: Lang): BibliographySource[] {
	const sources = new Map<string, MutableSource>();

	function add(citation: Citation, use: BibliographyUse) {
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
		if (!locator.uses.some((existing) => existing.href === use.href)) locator.uses.push(use);
	}

	for (const [key, entry] of Object.entries(TEXTS)) {
		const gloss = entry.glosses[lang];
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
			for (const citation of word.function_citations ?? []) {
				add(citation, { ...textUse, href: `${textUse.href}?w=${wordId}` });
			}
		}
	}

	for (const [lemma, sense] of Object.entries(LEXICON.senses[lang])) {
		for (const citation of sense.note_citations ?? []) {
			add(citation, {
				title: LEXICON.lemmata[lemma]?.head ?? lemma,
				href: `/app/${lang}/lemma/${encodeURIComponent(lemma)}`
			});
		}
	}

	return [...sources.values()]
		.map((source) => ({
			title: source.title,
			locators: [...source.locators.values()]
				.map((locator) => ({
					...locator,
					uses: locator.uses.sort((a, b) => a.title.localeCompare(b.title))
				}))
				.sort((a, b) => a.locator.localeCompare(b.locator))
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
}

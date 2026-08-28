import { lemmaSlug } from './lemma-slug';
import { LEXICON, type Citation, type SenseEntry, type TextEntry } from './corpus';
import type { Lang } from './i18n';

export type BibliographyRole = 'translation' | 'context' | 'rubric' | 'word' | 'lemma';

export interface BibliographyUse {
	title: string;
	href: string;
	/** The exact Latin word when this use supports a contextual word note. */
	detail?: string;
}

export interface BibliographyUseGroup {
	role: BibliographyRole;
	uses: BibliographyUse[];
}

export interface BibliographyLocator {
	locator: string;
	url?: string;
	groups: BibliographyUseGroup[];
}

export interface BibliographySource {
	title: string;
	roles: BibliographyRole[];
	locators: BibliographyLocator[];
}

interface MutableLocator {
	locator: string;
	url?: string;
	uses: Map<BibliographyRole, Map<string, BibliographyUse>>;
}

interface MutableSource {
	title: string;
	locators: Map<string, MutableLocator>;
}

const ROLE_ORDER: BibliographyRole[] = ['translation', 'context', 'rubric', 'word', 'lemma'];

/**
 * Build the reader-facing bibliography. The role is part of every use: an old
 * prayer book that supplied historically attested translation wording must not
 * look like a hidden footnote attached to several individual Latin words.
 *
 * Translation citations are deliberately collapsed to one use per text and
 * locator. Context notes likewise point to the text as a whole. Rubric and word
 * notes retain exact backlinks, because those claims live at an exact segment
 * or word. Latin textual witnesses and the critical apparatus remain in the
 * corpus rather than being projected into this page.
 */
export function buildBibliography(
	lang: Lang,
	texts: Record<string, TextEntry>,
	senses: Record<string, SenseEntry>
): BibliographySource[] {
	const sources = new Map<string, MutableSource>();

	function add(citation: Citation, role: BibliographyRole, use: BibliographyUse) {
		let source = sources.get(citation.title);
		if (!source) {
			source = { title: citation.title, locators: new Map() };
			sources.set(citation.title, source);
		}

		const locatorKey = `${citation.locator}\u0000${citation.url ?? ''}`;
		let locator = source.locators.get(locatorKey);
		if (!locator) {
			locator = { locator: citation.locator, url: citation.url, uses: new Map() };
			source.locators.set(locatorKey, locator);
		}

		let roleUses = locator.uses.get(role);
		if (!roleUses) {
			roleUses = new Map();
			locator.uses.set(role, roleUses);
		}
		const useKey = `${use.href}\u0000${use.title}\u0000${use.detail ?? ''}`;
		roleUses.set(useKey, use);
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
		const wordForms = new Map(
			entry.text.segments
				.flatMap((segment) => segment.words ?? [])
				.map((word) => [word.id, word.form])
		);

		for (const citation of gloss.about_citations ?? []) add(citation, 'context', textUse);

		for (const [segmentId, segment] of Object.entries(gloss.segments)) {
			const href = `${textUse.href}#${anchors.get(segmentId) ?? segmentId}`;
			for (const citation of segment.narrative_citations ?? []) {
				add(citation, 'rubric', { ...textUse, href });
			}
			for (const citation of segment.translation_citations ?? []) {
				add(citation, 'translation', textUse);
			}
		}

		for (const [wordId, word] of Object.entries(gloss.words)) {
			for (const citation of word.explanation_citations ?? []) {
				add(citation, 'word', {
					...textUse,
					href: `${textUse.href}?w=${wordId}`,
					detail: wordForms.get(wordId)
				});
			}
		}
	}

	for (const [lemma, sense] of Object.entries(senses)) {
		for (const citation of sense.note_citations ?? []) {
			add(citation, 'lemma', {
				title: LEXICON.lemmata[lemma]?.head ?? lemma,
				href: `/app/${lang}/lemma/${encodeURIComponent(lemmaSlug(lemma))}`
			});
		}
	}

	const by = (a: string, b: string) => a.localeCompare(b, lang);
	const rank = (role: BibliographyRole) => ROLE_ORDER.indexOf(role);
	return [...sources.values()]
		.map((source) => {
			const roles = new Set<BibliographyRole>();
			const locators = [...source.locators.values()]
				.map((locator) => ({
					locator: locator.locator,
					url: locator.url,
					groups: [...locator.uses.entries()]
						.map(([role, uses]) => {
							roles.add(role);
							return {
								role,
								uses: [...uses.values()].sort(
									(a, b) => by(a.title, b.title) || by(a.detail ?? '', b.detail ?? '')
								)
							};
						})
						.sort((a, b) => rank(a.role) - rank(b.role))
				}))
				.sort((a, b) => by(a.locator, b.locator));
			return {
				title: source.title,
				roles: [...roles].sort((a, b) => rank(a) - rank(b)),
				locators
			};
		})
		.sort((a, b) => by(a.title, b.title));
}

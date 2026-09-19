// The complete dictionary entry is a client-loaded resource on the shared
// lemma page. Keeping this loader separate gives the bundler a real lazy
// boundary: opening a prayer does not download the concordance.
import { occurrencesOf } from './concordance';
import { textHref } from './content-url';
import { LEXICON, loadSenses } from './corpus';
import type { Lang } from './i18n';
import { loadLemmaBibliography } from './bibliography';

export async function lemmaData(lang: Lang, lemma: string) {
	if (!LEXICON.lemmata[lemma]) return null;
	const [senses, occurrences, sources] = await Promise.all([
		loadSenses(lang),
		occurrencesOf(lemma),
		loadLemmaBibliography(lang, lemma)
	]);
	return {
		lemma,
		sources,
		entry: LEXICON.lemmata[lemma],
		sense: senses[lemma] ?? null,
		occurrences: occurrences.map((text) => ({
			...text,
			items: text.items.map((occurrence) => ({
				...occurrence,
				href: textHref(lang, text.textKey, { word: occurrence.wordId })
			}))
		}))
	};
}

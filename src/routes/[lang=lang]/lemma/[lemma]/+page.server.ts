// The lemma page needs the whole corpus to build its concordance, so that
// work happens HERE, at prerender time. The browser receives the finished
// rows and the one entry it shows — never the snapshot itself.
import { LEXICON } from '$lib/corpus';
import { occurrencesOf } from '$lib/concordance';
import { LANGS, type Lang } from '$lib/i18n';
import type { EntryGenerator, PageServerLoad } from './$types';

// Lemma pages are reached from the word panel (client-side), so the
// prerender crawler cannot discover them — enumerate every entry.
export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => Object.keys(LEXICON.lemmata).map((lemma) => ({ lang, lemma })));

export const load: PageServerLoad = ({ params }) => {
	const lang = params.lang as Lang;
	const lemma = params.lemma;
	return {
		lemma,
		entry: LEXICON.lemmata[lemma] ?? null,
		sense: LEXICON.senses[lang][lemma] ?? null,
		occurrences: occurrencesOf(lemma)
	};
};

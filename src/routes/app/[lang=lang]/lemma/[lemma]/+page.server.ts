// The lemma page needs the whole corpus to build its concordance, so that
// work happens HERE, at prerender time. The browser receives the finished
// rows and the one entry it shows — never the snapshot itself.
import { LEXICON } from '$lib/corpus';
import { lemmaData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

// Lemma pages are reached from the word panel (client-side), so the
// prerender crawler cannot discover them — enumerate every entry.
export const entries: EntryGenerator = () =>
	Object.keys(LEXICON.lemmata).flatMap((lemma) => LANGS.map((lang) => ({ lang, lemma })));

// The 404 is unreachable at prerender (entries() enumerates the lexicon)
// and live on the dev server — the same answer the reading route gives a
// bad slug, in the expression form because the guard is the whole body.
export const load: PageServerLoad = ({ params }) =>
	lemmaData(params.lang as Lang, params.lemma) ?? error(404, 'no such entry');

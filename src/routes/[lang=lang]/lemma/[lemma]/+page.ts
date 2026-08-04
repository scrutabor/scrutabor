import { LEXICON } from '$lib/corpus';
import { LANGS } from '$lib/i18n';
import type { EntryGenerator } from './$types';

// Lemma pages are reached from the word panel (client-side), so the
// prerender crawler cannot discover them — enumerate every entry.
export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => Object.keys(LEXICON.lemmata).map((lemma) => ({ lang, lemma })));

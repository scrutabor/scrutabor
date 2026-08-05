// The corpus is read HERE, on the server, at prerender time — never in the
// browser. A universal load would bundle every text into the client (the
// whole vendored snapshot is one chunk, and it was 758K), which is exactly
// the weight a first visit must not carry. The page therefore receives its
// own text, its own gloss layer, and only the lexicon entries its own words
// need: the web stays light, and the installed app fills its cache
// separately (decisions #27).
import { LEXICON, TEXTS, type LemmaEntry, type SenseEntry } from '$lib/corpus';
import { CATALOG } from '$lib/catalog';
import { LANGS, type Lang } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) =>
		CATALOG.flatMap((s) => s.texts).map((t) => ({ lang, category: t.category, slug: t.slug }))
	);

export const load: PageServerLoad = ({ params }) => {
	const entry = TEXTS[`${params.category}/${params.slug}`];
	if (!entry) error(404, 'no such text');
	const lang = params.lang as Lang;

	// Just the entries this text can ask about, not the whole dictionary.
	const lemmata: Record<string, LemmaEntry> = {};
	const senses: Record<string, SenseEntry> = {};
	for (const seg of entry.text.segments) {
		for (const w of seg.words ?? []) {
			if (LEXICON.lemmata[w.lemma]) lemmata[w.lemma] = LEXICON.lemmata[w.lemma];
			if (LEXICON.senses[lang][w.lemma]) senses[w.lemma] = LEXICON.senses[lang][w.lemma];
		}
	}
	return { doc: entry.text, gloss: entry.glosses[lang], lex: { lemmata, senses } };
};

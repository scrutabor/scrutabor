// As with a reading page: the corpus is read on the server at prerender
// time and the movement receives only the texts it inlines, plus the
// lexicon entries their words need. A universal load would put the whole
// snapshot in the browser.
import { LEXICON, TEXTS, type LemmaEntry, type SenseEntry } from '$lib/corpus';
import { LANGS, type Lang } from '$lib/i18n';
import { ORDO, movementById } from '$lib/ordo';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => ORDO.map((m) => ({ lang, movement: m.id })));

export const load: PageServerLoad = ({ params }) => {
	const movement = movementById(params.movement ?? '');
	if (!movement) error(404, 'no such movement');
	const lang = params.lang as Lang;

	const texts: Record<string, { doc: unknown; gloss: unknown }> = {};
	const lemmata: Record<string, LemmaEntry> = {};
	const senses: Record<string, SenseEntry> = {};
	for (const e of movement.entries) {
		const entry = e.text ? TEXTS[e.text] : undefined;
		if (!entry) continue;
		texts[e.text!] = { doc: entry.text, gloss: entry.glosses[lang] };
		for (const seg of entry.text.segments) {
			for (const w of seg.words ?? []) {
				if (LEXICON.lemmata[w.lemma]) lemmata[w.lemma] = LEXICON.lemmata[w.lemma];
				if (LEXICON.senses[lang][w.lemma]) senses[w.lemma] = LEXICON.senses[lang][w.lemma];
			}
		}
	}
	return { texts, lex: { lemmata, senses } };
};

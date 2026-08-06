// As with a reading page: the corpus is read on the server at prerender
// time and the movement receives only the texts it inlines, plus the
// lexicon entries their words need. A universal load would put the whole
// snapshot in the browser.
import { TEXTS, narrowLexicon, type TextDocument } from '$lib/corpus';
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
	const docs: TextDocument[] = [];
	for (const e of movement.entries) {
		const entry = e.text ? TEXTS[e.text] : undefined;
		if (!entry) continue;
		texts[e.text!] = { doc: entry.text, gloss: entry.glosses[lang] };
		docs.push(entry.text);
	}
	return { texts, lex: narrowLexicon(docs, lang) };
};

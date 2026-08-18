// One day's proper, as a file.
//
// This is decisions #27's own remedy arriving for the first content its shape
// could not hold. The day fills nine slots spread across three of the six
// movement pages, and a movement page inlines every text it shows — so
// prerendering the combinations would re-emit 650K per day, three hundred
// copies of the Kyrie to change one Introit, and cost 90 MB at the
// Sundays-and-feasts scope against a whole build of 4.3 MB. A day fetched
// instead is about 20K gzipped, and changing the date costs no navigation.
//
// It is PRERENDERED, not computed on request: there is no backend, and the
// corpus is read here on the server exactly as a reading page reads it. The
// output is a static file like any other, which is what lets the service
// worker put it in the book rather than the shell.
import { TEXTS, narrowLexicon, type TextDocument } from '$lib/corpus';
import { LANGS, type Lang } from '$lib/i18n';
import { PROPER_DAYS, SLOT_OF, partOf, properRank } from '$lib/proprium';
import { error, json } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => PROPER_DAYS.map((day) => ({ lang, day: day.id })));

export const GET: RequestHandler = ({ params }) => {
	const lang = params.lang as Lang;
	if (!LANGS.includes(lang)) error(404, 'no such language');
	const day = PROPER_DAYS.find((d) => d.id === params.day);
	if (!day) error(404, 'no such day');

	// The day's parts, in the order the rite says them rather than the order
	// the filesystem happens to hold them.
	const keys = Object.keys(TEXTS)
		.filter((key) => key.startsWith(`proprium/${day.id}-`))
		.sort((a, b) => properRank(a.split('/')[1]) - properRank(b.split('/')[1]));
	if (!keys.length) error(404, 'the day has no texts');

	const docs: TextDocument[] = [];
	const parts = keys.map((key) => {
		const entry = TEXTS[key];
		docs.push(entry.text);
		const slug = key.split('/')[1];
		const part = partOf(slug);
		if (!part) error(500, `${slug} names no known part of a proper`);
		return {
			key,
			part,
			// Where the Ordo shows it. Several parts can share one slot: the
			// chant between the readings is one slot for gradual, alleluia
			// and tract together.
			slot: SLOT_OF[part],
			doc: entry.text,
			gloss: entry.glosses[lang]
		};
	});

	// Only the dictionary this day's own words can ask about, the same slice a
	// reading page gets. The whole lexicon would defeat the point.
	const lex = narrowLexicon(docs, lang);

	return json(
		{ day: day.id, title: day.title, lang, parts, lex },
		// Immutable: the file is republished under a new build when the text
		// changes, and a reader who has the day should not re-fetch it.
		{ headers: { 'cache-control': 'public, max-age=604800, immutable' } }
	);
};

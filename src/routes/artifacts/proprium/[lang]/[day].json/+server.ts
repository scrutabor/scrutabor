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
import { properData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { PROPER_DAYS } from '$lib/proprium';
import { error, json } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => PROPER_DAYS.map((day) => ({ lang, day: day.id })));

export const GET: RequestHandler = ({ params }) => {
	const lang = params.lang as Lang;
	if (!LANGS.includes(lang)) error(404, 'no such language');
	const day = properData(params.day, lang);
	if (!day) error(404, 'no such day, or the day has no texts');

	return json(
		day,
		// Immutable: the file is republished under a new build when the text
		// changes, and a reader who has the day should not re-fetch it.
		{ headers: { 'cache-control': 'public, max-age=604800, immutable' } }
	);
};

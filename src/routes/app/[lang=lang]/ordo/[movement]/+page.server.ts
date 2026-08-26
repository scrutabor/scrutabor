// As with a reading page: the corpus is read on the server at prerender
// time and the movement receives only the texts it inlines, plus the
// lexicon entries their words need. A universal load would put the whole
// snapshot in the browser.
import { ordoData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { ORDO } from '$lib/ordo';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => ORDO.map((m) => ({ lang, movement: m.id })));

export const load: PageServerLoad = async ({ params }) => {
	const data = await ordoData(params.lang as Lang, params.movement ?? '');
	if (!data) error(404, 'no such movement');
	return data;
};

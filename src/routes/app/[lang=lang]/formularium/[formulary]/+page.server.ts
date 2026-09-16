// One static document per complete Mass formulary.
//
// Components keep their own stable anchors, but they no longer repeat the
// application frame and hydration payload as separate pages. This is both the
// Missal's natural reading unit and the largest reduction in hosted files.
import { properData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { PROPER_DAYS } from '$lib/proprium';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => PROPER_DAYS.map((day) => ({ lang, formulary: day.id })));

export const load: PageServerLoad = async ({ params }) => {
	const data = await properData(params.formulary, params.lang as Lang);
	if (!data) error(404, 'no such formulary');
	return data;
};

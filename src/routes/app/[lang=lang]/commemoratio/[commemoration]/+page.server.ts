// One static document per commemoration: its orations read as a set, the way a
// formulary's parts are, so the two Rogation orations the Mass of the day joins
// have a page of their own and an address every lemma and citation can reach.
import { commemorationPageData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { commemorationLookup } from '$lib/commemorationes';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) =>
		(commemorationLookup?.commemorations ?? []).map(({ id }) => ({ lang, commemoration: id }))
	);

export const load: PageServerLoad = async ({ params }) => {
	const data = await commemorationPageData(params.commemoration, params.lang as Lang);
	if (!data) error(404, 'no such commemoration');
	return data;
};

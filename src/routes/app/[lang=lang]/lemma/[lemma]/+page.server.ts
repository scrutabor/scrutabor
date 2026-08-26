// The corpus concordance first names the texts that contain the lemma. Only
// those files are opened HERE at prerender time; the browser receives the
// finished rows and the one entry it shows — never the snapshot itself.
import { loadSenses } from '$lib/corpus';
import { lemmaData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

// Lemma pages are reached from the word panel (client-side), so the
// prerender crawler cannot discover them — enumerate every entry.
export const entries: EntryGenerator = async () =>
	(
		await Promise.all(
			LANGS.map(async (lang) =>
				Object.keys(await loadSenses(lang)).map((lemma) => ({ lang, lemma }))
			)
		)
	).flat();

// The 404 is unreachable at prerender (entries() enumerates the lexicon)
// and live on the dev server — the same answer the reading route gives a
// bad slug, in the expression form because the guard is the whole body.
export const load: PageServerLoad = async ({ params }) =>
	(await lemmaData(params.lang as Lang, params.lemma)) ?? error(404, 'no such entry');

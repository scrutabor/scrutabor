// The corpus is read HERE, on the server, at prerender time — never in the
// browser. A universal load would bundle every text into the client (the
// whole vendored snapshot is one chunk, and it was 758K), which is exactly
// the weight a first visit must not carry. The page therefore receives its
// own text, its own gloss layer, and only the lexicon entries its own words
// need: the web stays light, and the installed app fills its cache
// separately (decisions #27).
import { TEXT_KEYS } from '$lib/corpus';
import { readingData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

// EVERY text in the corpus, not every text in the catalogue. The catalogue
// orders the shelf; it is not the list of what exists. The Ordo links each
// of its parts to the text's own page, and 27 of them — the whole Canon
// among them — were never prerendered, so on the built site those titles
// led to a 404 while the dev server served them happily. A route that is
// linked has to be built.
export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) =>
		TEXT_KEYS.map((key) => {
			const [category, slug] = key.split('/');
			return { lang, category, slug };
		})
	);

export const load: PageServerLoad = async ({ params }) => {
	const data = await readingData(params.lang as Lang, params.category, params.slug);
	if (!data) error(404, 'no such text');
	return data;
};

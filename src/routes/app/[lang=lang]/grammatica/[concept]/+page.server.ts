// Runs at prerender only: the example guard needs the corpus, and the
// browser must not receive it.
import { assertExamplesResolve } from '$lib/grammar.check';
import { CONCEPTS } from '$lib/grammar';
import { conceptData } from '$lib/loaders';
import { LANGS } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => CONCEPTS.map((c) => ({ lang, concept: c.id })));

export const load: PageServerLoad = ({ params }) => {
	assertExamplesResolve();
	const data = conceptData(params.concept);
	if (!data) error(404, 'no such concept');
	return data;
};

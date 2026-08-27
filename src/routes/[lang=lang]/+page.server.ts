// The landing's specimen is real: verse 34 of Psalm 118 — the He stanza,
// psalmi.118-he, the verse the motto quotes and the app is named from —
// sliced to that one verse and served exactly as a reading page serves
// its text (decisions #27: the corpus never reaches the browser bundle;
// a page receives its own words and the lexicon entries they can ask
// about, nothing more). The demonstration is therefore the mechanism
// itself: the same mode control, the same panel, the same data.
import { loadText, narrowLexicon } from '$lib/corpus';
import type { Lang } from '$lib/i18n';
import { pickSpecimen } from '$lib/specimen';
import pkg from '../../../package.json';
import type { PageServerLoad } from './$types';

// The zip travels with each GitHub release under a VERSIONED name — two
// copies on a disk must tell themselves apart — and since the landing
// deploys only on release, it can link the exact asset of its own
// version instead of a latest-indirection. Single-sourced from
// package.json; the release ritual bumps it with `npm version`, which
// also cuts the tag this URL names.
const ZIP = `https://github.com/scrutabor/scrutabor/releases/download/v${pkg.version}/Scrutabor-v${pkg.version}.zip`;

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang as Lang;
	const specimen = await pickSpecimen(lang, loadText);
	return {
		specimen: specimen && {
			...specimen,
			lex: await narrowLexicon([specimen.doc], lang)
		},
		zip: ZIP,
		version: pkg.version
	};
};

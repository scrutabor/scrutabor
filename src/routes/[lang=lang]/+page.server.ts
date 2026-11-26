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
import { isPreview } from '../../../scripts/pages-preview.mjs';
import type { PageServerLoad } from './$types';

// Published books link directly to their versioned archive. A preview can
// precede that archive, so it offers the latest published release by name.
const RELEASES = 'https://github.com/scrutabor/scrutabor/releases';
const version = isPreview(process.env.CF_PAGES_BRANCH) ? null : pkg.version;
const zip = version
	? `${RELEASES}/download/v${version}/Scrutabor-v${version}.zip`
	: `${RELEASES}/latest`;

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang as Lang;
	const specimen = await pickSpecimen(lang, loadText);
	return {
		specimen: specimen && {
			...specimen,
			lex: await narrowLexicon([specimen.doc], lang)
		},
		zip,
		version
	};
};

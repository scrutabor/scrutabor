// The landing's specimen is real: verse 34 of Psalm 118 — the He stanza,
// psalmi.118-he, the verse the motto quotes and the app is named from —
// sliced to that one verse and served exactly as a reading page serves
// its text (decisions #27: the corpus never reaches the browser bundle;
// a page receives its own words and the lexicon entries they can ask
// about, nothing more). The demonstration is therefore the mechanism
// itself: the same mode control, the same panel, the same data.
import { loadText, narrowLexicon, type GlossDocument, type TextDocument } from '$lib/corpus';
import type { Lang } from '$lib/i18n';
import { error } from '@sveltejs/kit';
import pkg from '../../../package.json';
import type { PageServerLoad } from './$types';

const VERSE = 's02';

// The zip travels with each GitHub release under a VERSIONED name — two
// copies on a disk must tell themselves apart — and since the landing
// deploys only on release, it can link the exact asset of its own
// version instead of a latest-indirection. Single-sourced from
// package.json; the release ritual bumps it with `npm version`, which
// also cuts the tag this URL names.
const ZIP = `https://github.com/scrutabor/scrutabor/releases/download/v${pkg.version}/Scrutabor-v${pkg.version}.zip`;

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang as Lang;
	const entry = await loadText('psalmi/118-he', lang);
	const verse = entry?.text.segments.find((s) => s.id === VERSE);
	if (!entry || !verse) error(500, 'the specimen verse is missing from the corpus snapshot');

	const doc: TextDocument = { ...entry.text, segments: [verse] };
	const full = entry.gloss;
	const ids = new Set((verse.words ?? []).map((w) => w.id));
	// The verse's own segment gloss, verified present rather than spread in
	// blind: `{ [id]: maybeUndefined }` would store undefined under a key
	// the type promises is a SegmentGloss.
	const verseGloss = full.segments[verse.id];
	if (!verseGloss) error(500, 'the specimen verse has no gloss in the corpus snapshot');
	const gloss: GlossDocument = {
		...full,
		// the stanza's introduction belongs to its own page, not the landing
		about: undefined,
		about_citations: undefined,
		segments: { [verse.id]: verseGloss },
		words: Object.fromEntries(Object.entries(full.words).filter(([id]) => ids.has(id)))
	};

	return {
		specimen: { doc, gloss, lex: await narrowLexicon([doc], lang) },
		zip: ZIP,
		version: pkg.version
	};
};

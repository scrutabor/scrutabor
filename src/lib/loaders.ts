// What each page needs, computed from the corpus — in one place, because two
// editions ask for it.
//
// On the site these run at PRERENDER, inside `+page.server.ts`, and their
// results are serialized into the built page: the corpus never reaches the
// browser and a reading page is a file (decisions #27). A downloaded copy has
// no server and no prerendered pages to read from, so its router calls the
// same functions in the browser, over the same vendored edition.
//
// They are plain functions of their parameters and nothing else. Anything that
// belongs to a request — a URL, headers, the `error()` helper — stays in the
// route file, so that what is shared is only the part both editions can run.
import {
	buildBibliography,
	loadTextBibliography,
	type TextBibliographyEvidence
} from './bibliography';
import { neighborsOf, sectionFor, textFor } from './catalog';
import { textHref } from './content-url';
import {
	hasText,
	loadText,
	loadTexts,
	narrowLexicon,
	textKeysFor,
	type TextDocument
} from './corpus';
import { LANGS, type Lang } from './i18n';
import { conceptById } from './grammar';
export { lemmaData } from './lemma-data';
import { movementById } from './ordo';
import { PROPER_DAYS, SLOT_OF } from './proprium';
import pkg from '../../package.json' with { type: 'json' };

/** The two facts every page under a language needs, and neither of which it
 * can read from a router that will not start without an origin. */
export function layoutData(lang: string, path: string) {
	return { lang, version: pkg.version, path };
}

/** Languages that can render this exact app path. Shared interface pages are
 * available everywhere; standalone readings follow their package manifests,
 * so language switching never points at a page that was not built. */
export async function appLayoutData(lang: string, path: string) {
	let languages: Lang[] = LANGS;
	const textMatch = path.match(/^\/([^/]+)\/([^/]+)$/);
	if (textMatch) {
		const key = `${textMatch[1]}/${textMatch[2]}`;
		if (hasText(key)) languages = LANGS.filter((language) => hasText(key, language));
	}
	return { ...layoutData(lang, path), languages };
}

export function catalogData(lang: Lang) {
	return { available: textKeysFor(lang) };
}

export async function readingData(lang: Lang, category: string, slug: string) {
	const key = `${category}/${slug}`;
	const entry = await loadText(key, lang);
	if (!entry) return null;

	const numbered = entry.text.segments.filter((seg) => seg.verse !== undefined);
	const verses = numbered.length
		? Object.fromEntries(numbered.map((seg) => [seg.id, seg.verse as number]))
		: undefined;

	return {
		category,
		slug,
		doc: entry.text,
		gloss: entry.gloss,
		// A reading names the text itself ("Chwała Ojcu"), not merely the
		// shelf it came from ("Modlitwy"); a non-catalogue text keeps the
		// section name as a safe fallback. Resolved HERE so the page never
		// imports the catalogue — which carries every manifest of the
		// edition and had grown to three quarters of a megabyte of script
		// on every prayer, to print one label.
		label: textFor(category, slug)?.localizedTitle[lang] ?? sectionFor(category)?.label[lang] ?? '',
		// Just the entries this text can ask about, not the whole dictionary.
		lex: await narrowLexicon([entry.text], lang),
		bibliography: await loadTextBibliography(lang, key),
		verses,
		around: neighborsOf(category, slug, new Set(textKeysFor(lang)))
	};
}

export async function ordoData(lang: Lang, movement: string) {
	const found = movementById(movement);
	if (!found) return null;

	const loaded = await loadTexts(
		found.entries.flatMap((entry) => (entry.text ? [entry.text] : [])),
		lang
	);
	const texts: Record<
		string,
		{ doc: unknown; gloss: unknown; bibliography: TextBibliographyEvidence }
	> = {};
	const docs: TextDocument[] = [];
	const bibliography = Object.fromEntries(
		await Promise.all(
			Object.keys(loaded).map(async (key) => [key, await loadTextBibliography(lang, key)] as const)
		)
	);
	for (const e of found.entries) {
		const entry = e.text ? loaded[e.text] : undefined;
		if (!entry) continue;
		texts[e.text!] = {
			doc: entry.text,
			gloss: entry.gloss,
			bibliography: bibliography[e.text!]
		};
		docs.push(entry.text);
	}
	return { movement, texts, lex: await narrowLexicon(docs, lang) };
}

export function conceptData(lang: Lang, concept: string) {
	// The same parity rule as lemmaData, for the grammar pages.
	const found = conceptById(concept);
	if (!found) return null;
	// Where each example reads: a Proper example lives inside its complete
	// formulary, and naming that page needs the formulary table. Resolved
	// here, at prerender, so a grammar page does not download the table —
	// and the catalogue behind it — to build a handful of links.
	const hrefs = Object.fromEntries(
		found.examples.map((example) => [
			`${example.textKey}:${example.wordId}`,
			textHref(lang, example.textKey, { word: example.wordId })
		])
	);
	return { concept, hrefs };
}

export async function bibliographyData(lang: Lang) {
	return await buildBibliography(lang);
}

/**
 * One day's proper: every part the day names, in the order the rite says them.
 *
 * The site groups a few days into each transport pack and extracts the chosen
 * day when the reader picks a date — prerendering the day into the Ordo's own
 * pages would re-emit 650K per day and cost 90 MB at the Sundays-and-feasts
 * scope. A downloaded copy already holds the whole corpus, so it calls this
 * directly and needs no artifact at all.
 */
export async function properData(day: string, lang: Lang) {
	const dayIndex = PROPER_DAYS.findIndex((candidate) => candidate.id === day);
	const found = PROPER_DAYS[dayIndex];
	if (!found) return null;

	const keyedParts = found.components.map(({ text: key, role: part, condition }) => ({
		key,
		part,
		condition
	}));
	if (!keyedParts.length) return null;
	const keys = keyedParts.map(({ key }) => key);

	const [loaded, bibliography] = await Promise.all([
		loadTexts(keys, lang),
		Promise.all(keys.map((key) => loadTextBibliography(lang, key)))
	]);
	const docs: TextDocument[] = [];
	const parts = keyedParts.map(({ key, part, condition }, index) => {
		const entry = loaded[key];
		docs.push(entry.text);
		return {
			key,
			part,
			condition,
			// Where the Ordo shows it. Several parts can share one slot: the
			// chant between the readings is one slot for gradual, alleluia
			// and tract together.
			slot: SLOT_OF[part],
			doc: entry.text,
			gloss: entry.gloss,
			bibliography: bibliography[index]
		};
	});

	// Only the dictionary this day's own words can ask about, the same slice a
	// reading page gets. The whole lexicon would defeat the point.
	return {
		day: found.id,
		title: found.title,
		partial: found.partial ?? false,
		around: {
			prev: PROPER_DAYS[dayIndex - 1] && {
				id: PROPER_DAYS[dayIndex - 1].id,
				title: PROPER_DAYS[dayIndex - 1].title
			},
			next: PROPER_DAYS[dayIndex + 1] && {
				id: PROPER_DAYS[dayIndex + 1].id,
				title: PROPER_DAYS[dayIndex + 1].title
			}
		},
		lang,
		parts,
		lex: await narrowLexicon(docs, lang)
	};
}

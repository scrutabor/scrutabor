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
import { buildBibliography } from './bibliography';
import { occurrencesOf } from './concordance';
import {
	LEXICON,
	TEXT_KEYS,
	loadAllTexts,
	loadText,
	loadTexts,
	narrowLexicon,
	type TextDocument
} from './corpus';
import type { Lang } from './i18n';
import { conceptById } from './grammar';
import { movementById } from './ordo';
import { PROPER_DAYS, SLOT_OF, partOf, properRank } from './proprium';
import pkg from '../../package.json' with { type: 'json' };

/** The two facts every page under a language needs, and neither of which it
 * can read from a router that will not start without an origin. */
export function layoutData(lang: string, path: string) {
	return { lang, version: pkg.version, path };
}

export async function readingData(lang: Lang, category: string, slug: string) {
	const entry = await loadText(`${category}/${slug}`);
	if (!entry) return null;

	const numbered = entry.text.segments.filter((seg) => seg.verse !== undefined);
	const verses = numbered.length
		? Object.fromEntries(numbered.map((seg) => [seg.id, seg.verse as number]))
		: undefined;

	return {
		category,
		slug,
		doc: entry.text,
		gloss: entry.glosses[lang],
		// Just the entries this text can ask about, not the whole dictionary.
		lex: narrowLexicon([entry.text], lang),
		verses
	};
}

export async function ordoData(lang: Lang, movement: string) {
	const found = movementById(movement);
	if (!found) return null;

	const loaded = await loadTexts(
		found.entries.flatMap((entry) => (entry.text ? [entry.text] : []))
	);
	const texts: Record<string, { doc: unknown; gloss: unknown }> = {};
	const docs: TextDocument[] = [];
	for (const e of found.entries) {
		const entry = e.text ? loaded[e.text] : undefined;
		if (!entry) continue;
		texts[e.text!] = { doc: entry.text, gloss: entry.glosses[lang] };
		docs.push(entry.text);
	}
	return { movement, texts, lex: narrowLexicon(docs, lang) };
}

export async function lemmaData(lang: Lang, lemma: string) {
	// Null for a lemma the lexicon has never heard of — the same answer the
	// other loaders give for a bad slug, so the two editions cannot differ:
	// the site 404s (the route is only prerendered for real entries) and
	// the downloaded copy must not answer the same address with a page.
	if (!LEXICON.lemmata[lemma]) return null;
	return {
		lemma,
		entry: LEXICON.lemmata[lemma],
		sense: LEXICON.senses[lang][lemma] ?? null,
		occurrences: await occurrencesOf(lemma)
	};
}

export function conceptData(concept: string) {
	// The same parity rule as lemmaData, for the grammar pages.
	return conceptById(concept) ? { concept } : null;
}

export async function bibliographyData(lang: Lang) {
	return { sources: buildBibliography(lang, await loadAllTexts()) };
}

/**
 * One day's proper: every part the day names, in the order the rite says them.
 *
 * The site prerenders this as a FILE per day per language and fetches it when
 * the reader picks a date — prerendering the day into the Ordo's own pages
 * would re-emit 650K per day and cost 90 MB at the Sundays-and-feasts scope
 * (decisions #27, revised 2026-08-18). A downloaded copy already holds the
 * whole corpus, so it calls this directly and needs no artifact at all.
 */
export async function properData(day: string, lang: Lang) {
	const found = PROPER_DAYS.find((d) => d.id === day);
	if (!found) return null;

	// Membership by the exact day id, not by prefix: the slug is the day id
	// plus a known part suffix, and a prefix match would let a day whose id
	// begins with another's (nativitas / nativitas-vigilia) pull the other
	// day's parts into its Mass.
	const keys = TEXT_KEYS.filter((key) => {
		const [category, slug] = key.split('/');
		if (category !== 'proprium') return false;
		const part = partOf(slug);
		return part !== undefined && slug.slice(0, -(part.length + 1)) === found.id;
	}).sort((a, b) => properRank(a.split('/')[1]) - properRank(b.split('/')[1]));
	if (!keys.length) return null;

	const loaded = await loadTexts(keys);
	const docs: TextDocument[] = [];
	const parts = keys.map((key) => {
		const entry = loaded[key];
		docs.push(entry.text);
		const slug = key.split('/')[1];
		const part = partOf(slug);
		if (!part) throw new Error(`${slug} names no known part of a proper`);
		return {
			key,
			part,
			// Where the Ordo shows it. Several parts can share one slot: the
			// chant between the readings is one slot for gradual, alleluia
			// and tract together.
			slot: SLOT_OF[part],
			doc: entry.text,
			gloss: entry.glosses[lang]
		};
	});

	// Only the dictionary this day's own words can ask about, the same slice a
	// reading page gets. The whole lexicon would defeat the point.
	return { day: found.id, title: found.title, lang, parts, lex: narrowLexicon(docs, lang) };
}

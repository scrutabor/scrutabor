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
import { LEXICON, TEXTS, narrowLexicon, type TextDocument } from './corpus';
import type { Lang } from './i18n';
import { movementById } from './ordo';
import { PROPER_DAYS, SLOT_OF, partOf, properRank } from './proprium';
import pkg from '../../package.json' with { type: 'json' };

/** The two facts every page under a language needs, and neither of which it
 * can read from a router that will not start without an origin. */
export function layoutData(lang: string, path: string) {
	return { lang, version: pkg.version, path };
}

export function readingData(lang: Lang, category: string, slug: string) {
	const entry = TEXTS[`${category}/${slug}`];
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

export function ordoData(lang: Lang, movement: string) {
	const found = movementById(movement);
	if (!found) return null;

	const texts: Record<string, { doc: unknown; gloss: unknown }> = {};
	const docs: TextDocument[] = [];
	for (const e of found.entries) {
		const entry = e.text ? TEXTS[e.text] : undefined;
		if (!entry) continue;
		texts[e.text!] = { doc: entry.text, gloss: entry.glosses[lang] };
		docs.push(entry.text);
	}
	return { movement, texts, lex: narrowLexicon(docs, lang) };
}

export function lemmaData(lang: Lang, lemma: string) {
	return {
		lemma,
		entry: LEXICON.lemmata[lemma] ?? null,
		sense: LEXICON.senses[lang][lemma] ?? null,
		occurrences: occurrencesOf(lemma)
	};
}

export function bibliographyData(lang: Lang) {
	return { sources: buildBibliography(lang) };
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
export function properData(day: string, lang: Lang) {
	const found = PROPER_DAYS.find((d) => d.id === day);
	if (!found) return null;

	const keys = Object.keys(TEXTS)
		.filter((key) => key.startsWith(`proprium/${found.id}-`))
		.sort((a, b) => properRank(a.split('/')[1]) - properRank(b.split('/')[1]));
	if (!keys.length) return null;

	const docs: TextDocument[] = [];
	const parts = keys.map((key) => {
		const entry = TEXTS[key];
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

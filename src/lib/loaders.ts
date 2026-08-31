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
import { neighborsOf } from './catalog';
import { occurrencesOf } from './concordance';
import {
	LEXICON,
	hasText,
	loadSenses,
	loadText,
	loadTexts,
	narrowLexicon,
	textKeysFor,
	type TextDocument
} from './corpus';
import { LANGS, type Lang } from './i18n';
import { conceptById } from './grammar';
import { movementById } from './ordo';
import { PROPER_DAYS, SLOT_OF } from './proprium';
import { lemmaOfSlug } from './lemma-slug';
import pkg from '../../package.json' with { type: 'json' };

/** The two facts every page under a language needs, and neither of which it
 * can read from a router that will not start without an origin. */
export function layoutData(lang: string, path: string) {
	return { lang, version: pkg.version, path };
}

/** Languages that can render this exact app path. Shared interface pages are
 * available everywhere; readings and lemma pages follow their package
 * manifests, so language switching never points at a page that was not built. */
export async function appLayoutData(lang: string, path: string) {
	let languages: Lang[] = LANGS;
	const textMatch = path.match(/^\/([^/]+)\/([^/]+)$/);
	if (textMatch) {
		const key = `${textMatch[1]}/${textMatch[2]}`;
		if (hasText(key)) languages = LANGS.filter((language) => hasText(key, language));
	}
	const lemmaMatch = path.match(/^\/lemma\/([^/]+)$/);
	if (lemmaMatch) {
		let lemma: string | undefined;
		try {
			lemma = lemmaOfSlug(decodeURIComponent(lemmaMatch[1]));
		} catch {
			lemma = undefined;
		}
		languages = lemma
			? (
					await Promise.all(
						LANGS.map(async (language) => ((await loadSenses(language))[lemma] ? language : null))
					)
				).filter((language): language is Lang => language !== null)
			: [];
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

export async function lemmaData(lang: Lang, lemma: string) {
	// Null for a lemma the lexicon has never heard of — the same answer the
	// other loaders give for a bad slug, so the two editions cannot differ:
	// the site 404s (the route is only prerendered for real entries) and
	// the downloaded copy must not answer the same address with a page.
	if (!LEXICON.lemmata[lemma]) return null;
	const senses = await loadSenses(lang);
	return {
		lemma,
		entry: LEXICON.lemmata[lemma],
		sense: senses[lemma] ?? null,
		occurrences: await occurrencesOf(lemma)
	};
}

export function conceptData(concept: string) {
	// The same parity rule as lemmaData, for the grammar pages.
	return conceptById(concept) ? { concept } : null;
}

export async function bibliographyData(lang: Lang) {
	return await buildBibliography(lang);
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

	const keyedParts = found.components.map(({ text: key, role: part }) => ({ key, part }));
	if (!keyedParts.length) return null;
	const keys = keyedParts.map(({ key }) => key);

	const [loaded, bibliography] = await Promise.all([
		loadTexts(keys, lang),
		Promise.all(keys.map((key) => loadTextBibliography(lang, key)))
	]);
	const docs: TextDocument[] = [];
	const parts = keyedParts.map(({ key, part }, index) => {
		const entry = loaded[key];
		docs.push(entry.text);
		return {
			key,
			part,
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
		lang,
		parts,
		lex: await narrowLexicon(docs, lang)
	};
}

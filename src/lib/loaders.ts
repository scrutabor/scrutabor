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
	type TextDocument,
	type TextEntry
} from './corpus';
import { LANGS, M, type Lang } from './i18n';
import { conceptById } from './grammar';
export { lemmaData } from './lemma-data';
import { movementById } from './ordo';
import { PROPER_DAYS, SLOT_OF, dayById } from './proprium';
import { CANON_VARIANTS, CANON_ROLES, canonKey, validateCanonPack } from './canon';
import { DISMISSAL_ROLE, PASCHAL_DISMISSAL, validateDismissalPack } from './dismissal';
import {
	COMMEMORATION_DECLARATIONS,
	commemorationLookup,
	SITUATIONS,
	validateCommemorationPack
} from './commemorationes';
import { commemorationTitle, commemorationAbout } from './corpus-metadata';
import { introductionBodies, introductionEventsFor, introductionOwners } from './introductiones';
import { announcementOwners } from './reading-announcements';
import type { VariantPack } from './variant-resource';
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

	const events = introductionEventsFor(found.entries.map((entry) => entry.id));
	const owners: Record<string, TextEntry> = Object.keys(events).length
		? await loadTexts(introductionOwners(), lang)
		: {};
	// The introductions belong to the spine and are the same on every day: read from their
	// owner texts here, at prerender, and never fetched again with the day.
	const introductions = Object.fromEntries(
		Object.entries(events).map(([part, event]) => [
			part,
			introductionBodies(
				event,
				Object.fromEntries(
					Object.entries(owners).map(([key, entry]) => [
						key,
						{ doc: entry.text, gloss: entry.gloss }
					])
				)
			)
		])
	);
	const loaded = await loadTexts(
		found.entries.flatMap((entry) => (entry.text ? [entry.text] : [])),
		lang
	);
	const texts: Record<
		string,
		{ doc: unknown; gloss: unknown; bibliography: TextBibliographyEvidence }
	> = {};
	const docs: TextDocument[] = [];
	const readingEntries = found.entries.some((e) => e.id === 'epistola' || e.id === 'evangelium')
		? await loadTexts(announcementOwners(), lang)
		: {};
	const readingOwners = Object.fromEntries(
		await Promise.all(
			Object.entries(readingEntries).map(async ([key, entry]) => {
				docs.push(entry.text);
				return [
					key,
					{
						doc: entry.text,
						gloss: entry.gloss,
						bibliography: await loadTextBibliography(lang, key)
					}
				];
			})
		)
	);
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
	for (const bodies of Object.values(introductions)) docs.push(...bodies.map(({ doc }) => doc));
	return { movement, texts, introductions, readingOwners, lex: await narrowLexicon(docs, lang) };
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

/** Eleven shared nonordinary bodies, emitted once per language, not per Mass. */
export async function canonData(lang: Lang) {
	const declarations = CANON_VARIANTS.map((id) => {
		const key = canonKey(id);
		const slot = CANON_ROLES.find((role) => key.startsWith(`ordinarium/${role}-`));
		if (!slot) throw new Error('invalid Canon body identity');
		return { key, slot };
	});
	return variantData(lang, declarations, validateCanonPack);
}

/** The commemoration orations, once per language, joined to any Mass the corpus pairs them with. */
export async function commemorationData(lang: Lang) {
	return variantData(lang, COMMEMORATION_DECLARATIONS, validateCommemorationPack);
}

/** Which formulary of a resolved commemoration's pair is the feast its page lists the dates
 * under. The impeded Sunday and the Advent feria are commemorated in the feast's own Mass, so the
 * feast is the pair's Mass; the impeded feast is commemorated in the Sunday's Mass, so the feast
 * is the formulary the pair resolves to. Each date then names the pair's other formulary: the
 * Sunday, or the Mass of an Ember day of Advent. */
export const RESOLVED_FEAST_SIDE: Readonly<Record<string, 'mass' | 'formulary'>> = {
	'dominica-impedita': 'mass',
	'feria-adventus': 'mass',
	'festum-impeditum': 'formulary'
};

/** How a resolved commemoration's page orders its feasts. The impeded feasts and the three feasts
 * of the Advent feria read by the calendar, in civil order. The impeded Sunday's seven principal
 * feasts keep the edition's formulary order. */
export const RESOLVED_FEAST_ORDER: Readonly<Record<string, 'edition' | 'civil'>> = {
	'dominica-impedita': 'edition',
	'feria-adventus': 'civil',
	'festum-impeditum': 'civil'
};

/** A commemoration's orations read as one document, the way a formulary's parts are. A
 * commemoration resolved per date has none of its own: its page lists, under each feast, the
 * dates this edition resolves and the Sunday of each, whose Mass makes the commemoration or
 * whose orations it says. */
export async function commemorationPageData(id: string, lang: Lang) {
	const entry = commemorationLookup?.commemorations.find((candidate) => candidate.id === id);
	if (!entry) return null;
	const title = {
		la: entry.title,
		...Object.fromEntries(LANGS.map((language) => [language, commemorationTitle(id, language)]))
	};
	if (entry.resolved) {
		// The rule is said in words before its dates, and the dates stand under their feast; a
		// resolved commemoration without either would be a list nobody could read, so the page is
		// not built.
		if (
			!LANGS.every((language) => Object.hasOwn(M[language].commemorationRules, id)) ||
			!Object.hasOwn(RESOLVED_FEAST_SIDE, id) ||
			!Object.hasOwn(RESOLVED_FEAST_ORDER, id)
		)
			throw new Error('resolved commemoration without its rule');
		const side = RESOLVED_FEAST_SIDE[id];
		// A Mass this edition does not author (an Ember day of Advent) is named and never linked,
		// and only on a date where nothing is said from it. Any other would be a name invented here.
		const absentMass = (other: string, said: boolean): Record<string, string> => {
			if (
				said ||
				!LANGS.every((language) => Object.hasOwn(M[language].commemorationAbsentMasses, other))
			)
				throw new Error('resolved commemoration date names an unknown Mass');
			return Object.fromEntries(
				LANGS.map((language) => [language, M[language].commemorationAbsentMasses[other]])
			);
		};
		const pairs = commemorationLookup!.datesOf(id).map(({ date, mass, formulary, decisions }) => ({
			date,
			feast: side === 'mass' ? mass : formulary,
			other: side === 'mass' ? formulary : mass,
			said: SITUATIONS.some((situation) => decisions[situation] === 'admitted')
		}));
		const feasts = PROPER_DAYS.filter((day) => pairs.some(({ feast }) => feast === day.id)).map(
			(day) => ({
				id: day.id,
				title: day.title,
				dates: pairs
					.filter(({ feast }) => feast === day.id)
					.map(({ date, other, said }) => {
						const edition = (other && dayById(other)?.title) || null;
						return {
							date,
							formulary: other,
							title: edition ?? (other ? absentMass(other, said) : null),
							authored: edition !== null,
							said
						};
					})
			})
		);
		// A date whose feast is not a formulary of this edition would drop out of the list unseen.
		if (feasts.reduce((sum, { dates }) => sum + dates.length, 0) !== pairs.length)
			throw new Error('resolved commemoration date without its feast');
		// The impeded feasts and the Advent feria's feasts read by the calendar: a fixed feast's
		// dates share their month and day (St Matthias's leap-year dates stay together), so the
		// earliest date orders each group. The impeded Sunday's seven principal feasts keep the
		// edition's formulary order.
		if (RESOLVED_FEAST_ORDER[id] === 'civil') {
			const civil = ({ dates }: { dates: { date: string }[] }) =>
				Math.min(
					...dates.map(({ date }) => Number(date.slice(5, 7)) * 100 + Number(date.slice(8, 10)))
				);
			feasts.sort((a, b) => civil(a) - civil(b));
		}
		return { kind: 'resolved' as const, day: entry.id, title, lang, feasts };
	}
	const pack = await commemorationData(lang);
	const parts = entry.slots.map((slot) => {
		const body = pack.parts.find((part) => part.key === slot.text);
		if (!body || body.slot !== slot.after) throw new Error('commemoration body absent');
		const about = commemorationAbout(id, slot.key, lang);
		return {
			key: body.key,
			part: body.part,
			condition: undefined,
			slot: body.slot,
			doc: body.doc,
			gloss: about === undefined ? body.gloss : { ...body.gloss, about },
			bibliography: body.bibliography
		};
	});
	return {
		kind: 'orations' as const,
		day: entry.id,
		title,
		partial: false,
		around: {},
		lang,
		parts,
		lex: pack.lex
	};
}

/** One shared Easter dismissal body per language, not a copy in each Mass. */
export async function dismissalData(lang: Lang) {
	return variantData(
		lang,
		[{ key: PASCHAL_DISMISSAL.replace('.', '/'), slot: DISMISSAL_ROLE }],
		validateDismissalPack
	);
}

async function variantData<Role extends string>(
	lang: Lang,
	declarations: { key: string; slot: Role }[],
	validate: (value: unknown, lang: Lang) => VariantPack<Role>
) {
	const loaded = await loadTexts(
		declarations.map(({ key }) => key),
		lang
	);
	const parts = await Promise.all(
		declarations.map(async ({ key, slot }) => {
			const entry = loaded[key];
			if (!entry) throw new Error('variant language incomplete');
			return {
				key,
				part: slot,
				slot,
				doc: entry.text,
				gloss: entry.gloss,
				bibliography: await loadTextBibliography(lang, key)
			};
		})
	);
	return validate(
		{
			schema_version: '1.0.0',
			lang,
			parts,
			lex: await narrowLexicon(
				parts.map((part) => part.doc),
				lang
			)
		},
		lang
	);
}

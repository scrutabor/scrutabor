// The day's own texts: which days exist, what their parts are called, and
// where each part belongs in the Ordo.
//
// The Proper is not on any shelf (see lib/catalog). A reader reaches it by
// choosing a DAY, and the Ordo's own slots — the ones already labelled
// *z formularza dnia* — fill with that day's texts. This file is the table
// that makes the choosing possible: it names days and orders parts, and holds
// no content, exactly as the catalog holds none.

import type { Lang } from './i18n';

/** The parts of a Mass proper, in the order the rite says them.
 *
 * Keyed by the part alone, never by the day, so one list orders every
 * formulary there will ever be.
 */
export const PROPER_PARTS = [
	'introitus',
	'collecta',
	'epistola',
	'graduale',
	'alleluia',
	'tractus',
	'sequentia',
	'evangelium',
	'offertorium',
	'secreta',
	'communio',
	'postcommunio'
] as const;

export type ProperPart = (typeof PROPER_PARTS)[number];

/** Where a proprium slug falls in the rite, or -1 if it names no known part. */
export function properRank(slug: string): number {
	return PROPER_PARTS.findIndex((part) => slug.endsWith(`-${part}`));
}

/** The part a proprium slug names, or undefined. */
export function partOf(slug: string): ProperPart | undefined {
	const rank = properRank(slug);
	return rank < 0 ? undefined : PROPER_PARTS[rank];
}

/** Which Ordo slot a part fills.
 *
 * Not one-to-one. The Ordo has a single slot for the chant between the
 * readings, titled *Graduále, Allelúia, Tractus*, because which of the three
 * is sung depends on the season — so three parts arrive at one slot and the
 * day decides how many of them exist. Everything else maps straight across.
 */
export const SLOT_OF: Record<ProperPart, string> = {
	introitus: 'introitus',
	collecta: 'collecta',
	epistola: 'epistola',
	graduale: 'graduale',
	alleluia: 'graduale',
	tractus: 'graduale',
	sequentia: 'graduale',
	evangelium: 'evangelium',
	offertorium: 'offertorium',
	secreta: 'secreta',
	communio: 'communio',
	postcommunio: 'postcommunio'
};

export interface ProperDay {
	/** matches the corpus `variant`, and the slug prefix of every part */
	id: string;
	/** the season this day belongs to, for grouping a picker */
	season: 'adventus';
	/** as the Missal names it, and as a reader would */
	title: Record<'la' | Lang, string>;
	/** True while the edition carries only some of the day's parts.
	 *
	 * A formulary arrives one text at a time, and a reader who picks a day
	 * must be able to tell "this Mass has no Introit" from "this edition has
	 * not got there yet". Without the mark the Ordo shows the same generic
	 * description in both cases, which is the kind of silence this edition
	 * does not keep. */
	partial?: boolean;
}

// One entry per formulary the corpus carries. A day named here without texts
// behind it, or texts with no day named here, is a defect the tests catch.
export const PROPER_DAYS: ProperDay[] = [
	{
		id: 'dominica-i-adventus',
		season: 'adventus',
		title: {
			la: 'Dominica I Adventus',
			pl: 'I Niedziela Adwentu',
			en: 'First Sunday of Advent'
		}
	},
	{
		id: 'dominica-ii-adventus',
		season: 'adventus',
		title: {
			la: 'Dominica II Adventus',
			pl: 'II Niedziela Adwentu',
			en: 'Second Sunday of Advent'
		}
	}
];

export function dayById(id: string): ProperDay | undefined {
	return PROPER_DAYS.find((d) => d.id === id);
}

/** The artifact URL for one day in one language.
 *
 * Absolute on the site. In a DOWNLOADED copy there is no origin — the book is
 * wherever the reader unzipped it — so the offline build injects
 * `window.__scrutabor_up`, the way back to the root from the page currently
 * open, and the same hook that lets its pages find `_app/`. Without this the
 * fetch would ask for `file:///artifacts/…`, the day would never arrive, and
 * the installed book would silently lose the one thing offline was for.
 */
export function artifactPath(day: string, lang: Lang): string {
	const up = (globalThis as { __scrutabor_up?: string }).__scrutabor_up;
	const tail = `artifacts/proprium/${lang}/${day}.json`;
	return up === undefined ? `/${tail}` : `${up}${tail}`;
}

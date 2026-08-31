// The day's own texts: which days exist, what their parts are called, and
// where each part belongs in the Ordo.
//
// The Proper is not on any shelf (see lib/catalog). A reader reaches it by
// choosing a DAY, and the Ordo's own slots — the ones already labelled
// *z formularza dnia* — fill with that day's texts. This file is the table
// that makes the choosing possible: it names days and orders parts, and holds
// no content, exactly as the catalog holds none.

import type { Lang } from './i18n';
import { bindPlFields } from './polish';
import { dayOf, isoDate, type Kalendar } from './kalendarium';
import { PER_ANNUM_PROPER_DAYS } from './proper-days-per-annum';

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
	'praefatio',
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
	praefatio: 'praefatio',
	communio: 'communio',
	postcommunio: 'postcommunio'
};

/** The seasons of the year, in the order the Missal walks them. A picker
 * groups by these, so the list stays readable as days are added: one season
 * is a flat list of four, and the year is not. */
export const SEASONS = [
	'adventus',
	'nativitas',
	'epiphania',
	'septuagesima',
	'quadragesima',
	'passionis',
	'paschale',
	'per-annum'
] as const;
export type Season = (typeof SEASONS)[number];

export interface ProperDay {
	/** matches the corpus `variant`, and the slug prefix of every part */
	id: string;
	/** Corpus variant used for filename discovery when it differs from `id`.
	 *
	 * All Souls keeps its calendar identity while its three permitted Masses
	 * remain separately selectable corpus variants. */
	textPrefix?: string;
	/** the season this day belongs to, for grouping a picker */
	season: Season;
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
	/** A day may assign a text outside `proprium` to one of its slots.
	 *
	 * Prefaces are shared liturgical texts in `ordinarium`, not copies made
	 * once per feast. The mapping keeps that identity explicit while the
	 * usual proper parts continue to be discovered from the day's slug. */
	parts?: Partial<Record<ProperPart, string>>;
}

// One entry per formulary the corpus carries. A day named here without texts
// behind it, or texts with no day named here, is a defect the tests catch.
const PROPER_DAYS_SOURCE: ProperDay[] = [
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
	},
	{
		id: 'dominica-iii-adventus',
		season: 'adventus',
		title: {
			la: 'Dominica III Adventus',
			pl: 'III Niedziela Adwentu',
			en: 'Third Sunday of Advent'
		}
	},
	{
		id: 'dominica-iv-adventus',
		season: 'adventus',
		title: {
			la: 'Dominica IV Adventus',
			pl: 'IV Niedziela Adwentu',
			en: 'Fourth Sunday of Advent'
		}
	},
	{
		id: 'sanctissimae-trinitatis',
		season: 'per-annum',
		title: {
			la: 'In festo Sanctissimæ Trinitatis',
			pl: 'Uroczystość Trójcy Przenajświętszej',
			en: 'Feast of the Most Holy Trinity'
		},
		parts: {
			praefatio: 'ordinarium/praefatio-sanctissimae-trinitatis'
		}
	},
	{
		id: 'corporis-christi',
		season: 'per-annum',
		title: {
			la: 'In festo Sanctissimi Corporis Christi',
			pl: 'Uroczystość Najświętszego Ciała Chrystusa',
			en: 'Feast of Corpus Christi'
		}
	},
	{
		id: 'sacratissimi-cordis-iesu',
		season: 'per-annum',
		title: {
			la: 'In festo Sacratissimi Cordis Iesu',
			pl: 'Uroczystość Najświętszego Serca Jezusowego',
			en: 'Feast of the Most Sacred Heart of Jesus'
		},
		parts: {
			praefatio: 'ordinarium/praefatio-sacratissimi-cordis-iesu'
		}
	},
	...PER_ANNUM_PROPER_DAYS
];

/** Polish one-letter words bound to what follows (lib/polish), exactly as the
 * catalogue's own titles are. Without it "I Niedziela Adwentu" can break after
 * the numeral — in the picker, and in the sentence the hint builds around it —
 * which is the binding decisions #30 already holds the rest of the book to.
 * The Latin titles and the English in the same objects are untouched. */
export const PROPER_DAYS: ProperDay[] = bindPlFields(PROPER_DAYS_SOURCE);

export function dayById(id: string): ProperDay | undefined {
	return PROPER_DAYS.find((d) => d.id === id);
}

/** Today's formulary, if this edition carries it.
 *
 * The corpus computes the whole temporal cycle and ships it (lib/kalendarium);
 * this asks it what today is and then asks the shelf whether that Mass has
 * been written yet. Both halves matter: a reader at Mass on Sunday morning
 * should find the proper already right, and a reader on a day the edition has
 * not reached should be told which day it is rather than shown someone else's.
 */
export function dayToday(when: Date = new Date()): {
	/** the id of today's formulary, or '' if this edition has not got there */
	id: string;
	/** what today is, whether or not the edition carries it */
	on: Kalendar | null;
	/** the Sunday whose week today falls in, when today is a feria */
	week: Kalendar | null;
} {
	const { on, week } = dayOf(isoDate(when));
	return { id: on && dayById(on.formulary) ? on.formulary : '', on, week };
}

/** The artifact URL for one day in one language.
 *
 * The SITE's address, and only the site's. A downloaded copy carries the whole
 * corpus in its runtime and builds the day from it ($lib/proper-local), so it
 * never asks for this — which is just as well, because Chrome refuses
 * `fetch()` for file:// outright.
 */
export function artifactPath(day: string, lang: Lang): string {
	return `/artifacts/proprium/${lang}/${day}.json`;
}

/** What today is, as `dayToday` reports it. */
export type Today = ReturnType<typeof dayToday>;

/**
 * Which line belongs under the day picker.
 *
 * A DECISION, and therefore a function rather than four branches in a
 * template. It got the order wrong once and shipped: the two notes about
 * today were derived from the clock alone and printed ahead of the branch
 * that reads the choice, so a reader who picked a day was still told that
 * today's formulary is not here — for eleven months of the year, since that
 * is how long today spends outside the Sundays this edition carries.
 *
 * The order is what the control is DOING, then what it would do if left
 * alone:
 *
 * · `chosen` — the reader picked a day, and that is the whole answer.
 * · `week` — nothing is picked, and today is a FERIA, which has no Mass in
 *   the temporal table at all. The week's Sunday is named and nothing is
 *   claimed: the Missale prints a Mass for every day of Lent and none between
 *   the Sundays of Advent, and no rule this edition has transcribed settles
 *   the second case.
 * · `ahead` — nothing is picked, today HAS a Mass of its own, and this
 *   edition has not written it yet.
 * · `none` — nothing is picked and nothing is owed. Today is either carried
 *   already or is a day the picker has no more to say about.
 */
export type DayHint =
	{ kind: 'chosen' } | { kind: 'week'; sunday: ProperDay } | { kind: 'ahead' } | { kind: 'none' };

export function dayHint(chosen: string, now: Today | null): DayHint {
	if (chosen) return { kind: 'chosen' };
	if (!now || now.id) return { kind: 'none' };
	if (!now.on) {
		// A feria. It is worth naming only if the edition can open the Sunday
		// it belongs to — otherwise the reader is told about a week they
		// cannot read either, which says nothing.
		const sunday = now.week && dayById(now.week.formulary);
		return sunday ? { kind: 'week', sunday } : { kind: 'ahead' };
	}
	return { kind: 'ahead' };
}

// Which day of the church's year a date is.
//
// The corpus computes this and ships it as a table (`calendar.json`): decision #6
// says apps never implement movable-feast logic, and there are three readers
// coming. Everything here is a lookup — the arithmetic of Easter, the
// displacement of the Fourth Sunday of Advent by the Vigil of the Nativity,
// the Sundays after Epiphany that Septuagesima cuts off and reappear in
// November, all of it happened in Python against the Rubricae generales and
// was verified against the Missal's own table of movable feasts.
//
// What the table holds is the days that have a Mass of their own: the Sundays
// and the feasts of the Lord that belong to the season. Ferias are absent on
// purpose, and the honest answer for a Tuesday is the WEEK it falls in, which
// is what `dayOf` returns alongside. Which Mass that Tuesday actually takes
// depends on the season — the Missale prints one for every day of Lent and
// none between the Sundays of Advent — and no rule the corpus has transcribed
// settles the second case, so the week is named and nothing is claimed.
import calendar from './data/calendar.json';

export interface Kalendar {
	/** The formulary said on the day — the id a proper's texts are filed under. */
	formulary: string;
	/** What the day is in the year's own order, which differs from the
	 * formulary where a feast took the Sunday's place or n. 18 moved a Mass. */
	position: string;
	season: string;
	/** First or second class (Rubricae generales n. 8). A Sunday of the first
	 * class yields to nothing but the one feast n. 15 itself excepts, the
	 * Immaculate Conception, which the table carries — so for those Sundays
	 * the answer is complete. A Sunday of the second class can be taken by any
	 * first-class feast (n. 16 a), and the table has no sanctoral to check. */
	dies: 1 | 2;
	/** The date this day falls on. */
	when: string;
}

type Row = [string, number, number, number, number];

const YEARS = calendar.years as unknown as Record<string, Row[]>;
const SPAN = Object.keys(YEARS)
	.map(Number)
	.sort((a, b) => a - b);

/** Every day in the table, in order — the liturgical years overlap the civil
 * ones, so this is flattened once rather than searched year by year. */
const DAYS: Row[] = SPAN.flatMap((year) => YEARS[String(year)]).sort((a, b) =>
	a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
);

/** The last date the table can still answer for: the final row's week runs
 * six days past the row itself. Computed at noon so no time zone can move
 * the date under the arithmetic. */
const EXTENT = (() => {
	const past = new Date(`${DAYS[DAYS.length - 1][0]}T12:00:00`);
	past.setDate(past.getDate() + 6);
	return isoDate(past);
})();

function shape(row: Row): Kalendar {
	return {
		when: row[0],
		formulary: calendar.formularies[row[1]],
		season: calendar.seasons[row[2]],
		dies: row[3] as 1 | 2,
		position: calendar.formularies[row[4]]
	};
}

/** A local date as the table spells it. NOT `toISOString`, which converts to
 * UTC first and hands back yesterday for anyone east of Greenwich after
 * midnight — the reader's own Sunday is the one that matters here. */
export function isoDate(when: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
}

/** The day this date IS, when it has a Mass of its own. */
export function dayOn(iso: string): Kalendar | null {
	const row = DAYS.find((r) => r[0] === iso);
	return row ? shape(row) : null;
}

/**
 * Where the reader is: the day itself if it has a Mass, and the day whose week
 * they are in either way.
 *
 * A Tuesday in Advent returns `on: null` and `week` naming the Sunday. That is
 * the distinction the app has to keep — offering the Sunday's Mass is right,
 * calling it today's is not.
 */
export function dayOf(iso: string): { on: Kalendar | null; week: Kalendar | null } {
	const on = dayOn(iso);
	// Past the table's end the honest answer is silence, not the last row: a
	// clock in 2102 is not forever in the twenty-fourth week after Pentecost
	// of 2101. The last Sunday's own week still counts — it runs six days
	// past the last row, to the eve of an Advent the table no longer holds.
	// (Before the first row both answers are null the same way.)
	if (iso > EXTENT) return { on: null, week: null };
	let week: Row | null = null;
	for (const row of DAYS) {
		if (row[0] > iso) break;
		week = row;
	}
	return { on, week: week && shape(week) };
}

/** The years the table covers, as the manifest declares them. */
export const COVERS: [number, number] = [SPAN[0], SPAN[SPAN.length - 1]];

/** Whether the table knows a formulary by this name, on any day of any year.
 *
 * The picker uses it to tell two absences apart: a REAL day this edition has
 * not written yet, and an id that names nothing — a mangled link. The first
 * deserves a note, the second the dayless view. */
export function formularyExists(id: string): boolean {
	return (calendar.formularies as string[]).includes(id);
}

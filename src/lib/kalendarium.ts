// Which day of the church's year a date is.
//
// The corpus computes this and ships it as a table (`kal.json`): decision #6
// says apps never implement movable-feast logic, and there are three readers
// coming. Everything here is a lookup — the arithmetic of Easter, the
// displacement of the Fourth Sunday of Advent by the Vigil of the Nativity,
// the Sundays after Epiphany that Septuagesima cuts off and reappear in
// November, all of it happened in Python against the Rubricae generales and
// was verified against the Missal's own table of movable feasts.
//
// What the table holds is the days that have a Mass of their own: the Sundays
// and the feasts of the Lord that belong to the season. Ferias are absent on
// purpose — in Advent and Lent they have Masses of their own rather than the
// Sunday's, so the honest answer for a Tuesday is the WEEK it falls in, which
// is what `dayOf` returns alongside.
import kal from './data/kal.json';

export interface Kalendar {
	/** The formulary said on the day — the id a proper's texts are filed under. */
	formulary: string;
	/** What the day is in the year's own order, which differs from the
	 * formulary where a feast took the Sunday's place or n. 18 moved a Mass. */
	position: string;
	season: string;
	/** First or second class (Rubricae generales n. 8). A first-class Sunday
	 * yields to nothing, which is why the table's answer is complete for it. */
	dies: 1 | 2;
	/** The date this day falls on. */
	when: string;
}

type Row = [string, number, number, number, number];

const YEARS = kal.y as unknown as Record<string, Row[]>;
const SPAN = Object.keys(YEARS)
	.map(Number)
	.sort((a, b) => a - b);

/** Every day in the table, in order — the liturgical years overlap the civil
 * ones, so this is flattened once rather than searched year by year. */
const DAYS: Row[] = SPAN.flatMap((year) => YEARS[String(year)]).sort((a, b) =>
	a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
);

function shape(row: Row): Kalendar {
	return {
		when: row[0],
		formulary: kal.f[row[1]],
		season: kal.s[row[2]],
		dies: row[3] as 1 | 2,
		position: kal.f[row[4]]
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
	let week: Kalendar | null = null;
	for (const row of DAYS) {
		if (row[0] > iso) break;
		week = shape(row);
	}
	return { on, week };
}

/** The years the table covers, as the manifest declares them. */
export const COVERS: [number, number] = [SPAN[0], SPAN[SPAN.length - 1]];

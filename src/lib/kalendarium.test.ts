// The calendar the corpus ships, and the day it says today is.
//
// The arithmetic is verified in the corpus, against the table the 1962 Missale
// prints itself — 416 values over 52 years. What is checked HERE is the part
// that lives in the app: that the table is present and complete, that a date is
// resolved without computing anything, and that the two questions a reader has
// stay apart. "Which Mass is said today" and "which week am I in" are not the
// same question on a Tuesday in Advent, and answering the second as though it
// were the first would put a Sunday's Mass on a weekday.
import { describe, expect, it } from 'vitest';
import { COVERS, dayOf, dayOn, isoDate } from './kalendarium';
import { PROPER_DAYS, dayToday } from './proprium';

describe('the calendar this edition ships', () => {
	it('covers the years decision #6 fixed', () => {
		expect(COVERS[0]).toBe(2026);
		// The liturgical year ENDING in 2101 is the one that carries the last
		// days of civil 2100.
		expect(COVERS[1]).toBe(2101);
	});

	it('names the Sundays a reader would look for', () => {
		// Easter 2026 is 5 April, and Advent opened on 30 November 2025.
		expect(dayOn('2026-04-05')?.formulary).toBe('dominica-resurrectionis');
		expect(dayOn('2025-11-30')?.formulary).toBe('dominica-i-adventus');
		expect(dayOn('2025-12-25')?.formulary).toBe('nativitas-domini');
	});

	it('keeps the day apart from the week it falls in', () => {
		// A Tuesday in the second week of Advent. In Advent and Lent a feria
		// has a Mass of its own, so the Sunday's is offered and never claimed.
		const tuesday = dayOf('2025-12-09');
		expect(tuesday.on, 'a feria has no Mass in this table').toBeNull();
		expect(tuesday.week?.formulary).toBe('dominica-ii-adventus');
	});

	it('reads the local date, not the world’s', () => {
		// `toISOString` converts to UTC first and hands back yesterday for
		// anyone east of Greenwich after midnight — which is exactly when this
		// value changes meaning.
		const lateOnSunday = new Date(2025, 10, 30, 23, 30);
		expect(isoDate(lateOnSunday)).toBe('2025-11-30');
	});

	it('says which formulary today has, and says nothing when the edition lacks it', () => {
		// Advent is what this edition carries, so a date inside it resolves and
		// a date outside it names the day without pretending to have its Mass.
		const advent = dayToday(new Date(2025, 11, 14));
		expect(advent.id).toBe('dominica-iii-adventus');

		const june = dayToday(new Date(2026, 5, 21));
		expect(june.id, 'the edition has not reached the Sundays after Pentecost').toBe('');
		expect(june.on?.formulary).toBeTruthy();
	});

	it('offers no day the shelf cannot open', () => {
		// The picker's whole contract: an id it returns must resolve to texts.
		for (let year = 2026; year <= 2030; year++) {
			for (const month of [0, 3, 6, 11]) {
				const { id } = dayToday(new Date(year, month, 14));
				if (id)
					expect(
						PROPER_DAYS.some((d) => d.id === id),
						`${year}-${month}`
					).toBe(true);
			}
		}
	});
});

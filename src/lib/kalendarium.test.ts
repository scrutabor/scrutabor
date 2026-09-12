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
import { COVERS, DATE_MAX, DATE_MIN, calendarCovers, dayOf, dayOn, isoDate } from './kalendarium';
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
		// A Tuesday in the second week of Advent. What Mass a feria takes
		// depends on the season and the table does not carry it either way, so
		// the Sunday's is offered and never claimed.
		const tuesday = dayOf('2025-12-09');
		expect(tuesday.on, 'a feria has no Mass in this table').toBeNull();
		expect(tuesday.week?.formulary).toBe('dominica-ii-adventus');
	});

	it('does not mistake a weekday feast for the Sunday of the week', () => {
		// The Assumption fell on Saturday in 2026. The following Wednesday is
		// in the week of Pentecost XII, not in a week named after 15 August.
		const wednesday = dayOf('2026-08-19');
		expect(wednesday.on).toBeNull();
		expect(wednesday.week?.when).toBe('2026-08-16');
	});

	it('publishes a strict date range for the picker', () => {
		expect(calendarCovers(DATE_MIN)).toBe(true);
		expect(calendarCovers(DATE_MAX)).toBe(true);
		expect(calendarCovers('2026-02-31')).toBe(false);
		expect(calendarCovers('2200-01-01')).toBe(false);
	});

	it('falls silent past either end of the table instead of answering with its edge', () => {
		// A device whose clock reset to 1970 or drifted past 2101 is not in
		// any week this table knows. The last row's own week still counts —
		// it runs six days past the row, to the eve of an Advent the table
		// no longer holds — and the day after that is nobody's.
		expect(dayOf('1970-01-01')).toEqual({ on: null, week: null });
		expect(dayOf('2200-01-01')).toEqual({ on: null, week: null });
		const lastWeekday = dayOf('2101-11-26');
		expect(lastWeekday.on).toBeNull();
		expect(lastWeekday.week?.formulary, 'the final week is still covered').toBeTruthy();
		expect(dayOf('2101-11-27')).toEqual({ on: null, week: null });
	});

	it('reads the local date, not the world’s', () => {
		// `toISOString` converts to UTC first and hands back yesterday for
		// anyone east of Greenwich after midnight — which is exactly when this
		// value changes meaning.
		const lateOnSunday = new Date(2025, 10, 30, 23, 30);
		expect(isoDate(lateOnSunday)).toBe('2025-11-30');
	});

	it('carries the days a reader would otherwise be told are ordinary weekdays', () => {
		// All found by an external review, all inside the scope the calendar
		// claimed to be exact about. Christmas Eve is the one a reader meets
		// first: without it the picker called 24 December a weekday.
		expect(dayOn('2026-12-24')?.formulary).toBe('vigilia-nativitatis');
		expect(dayOn('2027-01-01')?.formulary).toBe('in-octava-nativitatis');
		expect(dayOn('2028-12-31')?.formulary).toBe('dominica-infra-octavam-nativitatis');
		// n. 15 excepts one feast of the saints from the rule that a Sunday of
		// Advent yields to nothing. Without it the book opened on Advent II.
		expect(dayOn('2030-12-08')?.formulary).toBe('immaculata-conceptio');
		expect(dayOn('2030-12-08')?.position).toBe('dominica-ii-adventus');
	});

	it('carries the Epiphany cycle and its precedence at 13 January', () => {
		expect(dayOn('2027-01-03')?.formulary).toBe('sanctissimi-nominis-iesu');
		expect(dayOn('2027-01-06')?.formulary).toBe('epiphania-domini');
		expect(dayOn('2027-01-10')?.formulary).toBe('sancta-familia');
		expect(dayOn('2027-01-10')?.position).toBe('dominica-i-post-epiphaniam');
		expect(dayOn('2027-01-13')?.formulary).toBe('commemoratio-baptismatis-domini');
		expect(dayOn('2027-01-17')?.formulary).toBe('dominica-ii-post-epiphaniam');

		// In 2030 the Sunday after Epiphany falls on 13 January. The Holy
		// Family takes the Sunday, so the Baptism is not added as a second day.
		expect(dayOn('2030-01-13')?.formulary).toBe('sancta-familia');
		expect(dayOn('2030-01-13')?.position).toBe('dominica-i-post-epiphaniam');
	});

	it('carries all three pre-Lent Sundays', () => {
		expect(dayOn('2027-01-24')?.formulary).toBe('dominica-in-septuagesima');
		expect(dayOn('2027-01-31')?.formulary).toBe('dominica-in-sexagesima');
		expect(dayOn('2027-02-07')?.formulary).toBe('dominica-in-quinquagesima');
	});

	it('carries the first four Sundays of Lent', () => {
		expect(dayOn('2027-02-14')?.formulary).toBe('dominica-i-in-quadragesima');
		expect(dayOn('2027-02-21')?.formulary).toBe('dominica-ii-in-quadragesima');
		expect(dayOn('2027-02-28')?.formulary).toBe('dominica-iii-in-quadragesima');
		expect(dayOn('2027-03-07')?.formulary).toBe('dominica-iv-in-quadragesima');
	});

	it('carries both Sundays of Passiontide', () => {
		expect(dayOn('2027-03-14')?.formulary).toBe('dominica-i-passionis');
		expect(dayOn('2027-03-21')?.formulary).toBe('dominica-ii-passionis');
	});

	it('carries the Masses from Holy Thursday through Easter Sunday', () => {
		expect(dayOn('2027-03-25')?.formulary).toBe('feria-v-in-cena-domini');
		expect(dayOn('2027-03-27')?.formulary).toBe('vigilia-paschalis');
		expect(dayOn('2027-03-28')?.formulary).toBe('dominica-resurrectionis');
	});

	it('says which formulary today has throughout the span this edition carries', () => {
		// Advent, Christmas and the completed post-Pentecost cycle resolve to a
		// formulary the picker can open. Christmas Day selects the daytime Mass
		// by default while retaining all three variants in the catalogue.
		const advent = dayToday(new Date(2025, 11, 14));
		expect(advent.id).toBe('dominica-iii-adventus');

		expect(dayToday(new Date(2026, 11, 24)).id).toBe('vigilia-nativitatis');
		expect(dayToday(new Date(2026, 11, 25)).id).toBe('nativitas-domini-in-die');
		expect(dayToday(new Date(2027, 0, 1)).id).toBe('in-octava-nativitatis');

		const june = dayToday(new Date(2026, 5, 21));
		expect(june.id).toBe('dominica-iv-post-pentecosten');
		expect(june.on?.formulary).toBeTruthy();

		const corpusChristi = dayToday(new Date(2026, 5, 4));
		expect(corpusChristi.on?.formulary).toBe('corpus-christi');
		expect(corpusChristi.id).toBe('corporis-christi');
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

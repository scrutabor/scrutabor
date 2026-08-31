// Which line stands under the day picker, for every combination of what today
// is and what the reader picked.
//
// This exists because the order was wrong once and shipped. The two notes
// about TODAY — its Mass is not written yet, and today is a feria whose week
// ends at this Sunday — were derived from the clock alone and printed ahead of
// the branch that reads the choice. Both describe the DEFAULT, so they had
// nothing to say once a day was picked, and said it anyway. Today falls
// outside the four Sundays this edition carries for eleven months of the year,
// so the line was frozen on "choose another day" for almost anyone who looked.
//
// Every e2e test of that control had only ever looked at the state it opens
// in. A decision with four outcomes and two inputs is a table, and a table is
// worth enumerating.
import { describe, expect, it } from 'vitest';
import { PROPER_DAYS, dayHint, dayToday, type Today } from './proprium';

/** The four shapes `dayToday` can return, taken from the calendar rather than
 * hand-built so that a change in either would surface here. The fourth was
 * missed on the first draft of this file and the calendar corrected it: a
 * feria's week is not always one the edition can open. */
const SUNDAY = dayToday(new Date(2026, 11, 13)); // III Advent 2026, carried
const FERIA = dayToday(new Date(2026, 11, 15)); // the Tuesday after it
const AHEAD = dayToday(new Date(2026, 11, 24)); // Christmas Eve, not written
const STRANDED = dayToday(new Date(2026, 11, 26)); // a feria in an unwritten Christmas week
const CHOICE = 'dominica-i-adventus';

describe('the hint under the day picker', () => {
	it('reads the three shapes of today the calendar can return', () => {
		// The fixtures above are the whole point of the table below, so they
		// are asserted rather than assumed.
		expect(SUNDAY.id, 'a Sunday this edition carries').toBe('dominica-iii-adventus');
		expect(FERIA.id, 'a feria has no Mass of its own').toBe('');
		expect(FERIA.on, 'and none in the temporal table either').toBeNull();
		expect(FERIA.week?.formulary).toBe('dominica-iii-adventus');
		expect(AHEAD.id, 'a feast this edition has not written').toBe('');
		expect(AHEAD.on?.formulary, 'which the calendar can still name').toBe('vigilia-nativitatis');
		expect(STRANDED.on, 'a feria').toBeNull();
		expect(STRANDED.week?.formulary, 'of a week the edition cannot open either').toBe(
			'nativitas-domini'
		);
	});

	it('answers with the choice whenever there is one', () => {
		// The defect, stated as the rule it broke. Every shape of today.
		for (const [label, now] of [
			['a Sunday it carries', SUNDAY],
			['a feria', FERIA],
			['a day it has not reached', AHEAD],
			['a feria of a week it has not reached', STRANDED],
			['no calendar at all', null]
		] as [string, Today | null][]) {
			expect(dayHint(CHOICE, now).kind, label).toBe('chosen');
		}
	});

	it('says nothing extra when today is already open', () => {
		expect(dayHint('', SUNDAY).kind).toBe('none');
	});

	it('names the week when today is a feria, and never claims its Mass', () => {
		const hint = dayHint('', FERIA);
		expect(hint.kind).toBe('week');
		if (hint.kind !== 'week') throw new Error('unreachable');
		expect(hint.sunday.id).toBe('dominica-iii-adventus');
		expect(PROPER_DAYS).toContain(hint.sunday);
	});

	it('says the day is not here yet when the edition has not reached it', () => {
		expect(dayHint('', AHEAD).kind).toBe('ahead');
	});

	it('does not name a week it cannot open either', () => {
		// A feria is only worth naming by its week when the reader could then
		// open that Sunday. Where they could not, pointing at it says nothing
		// and the plainer line is the true one.
		expect(dayHint('', STRANDED).kind).toBe('ahead');
	});

	it('falls back to nothing owed when there is no calendar', () => {
		// Prerender and the moment before hydration: no clock has been read.
		expect(dayHint('', null).kind).toBe('none');
	});

	it('never names a week the reader cannot open', () => {
		// A feria whose Sunday is not in this edition has nothing useful to
		// say about its week, and says the plainer thing instead. Walk a year
		// of Tuesdays to find them rather than trusting that they exist.
		let ferias = 0;
		for (let week = 0; week < 52; week++) {
			const when = new Date(2027, 0, 5 + week * 7);
			const now = dayToday(when);
			if (now.id || now.on) continue;
			ferias++;
			const hint = dayHint('', now);
			if (hint.kind === 'week') expect(PROPER_DAYS).toContain(hint.sunday);
			else expect(hint.kind).toBe('ahead');
		}
		expect(ferias, 'a year of Tuesdays holds ferias').toBeGreaterThan(40);
	});
});

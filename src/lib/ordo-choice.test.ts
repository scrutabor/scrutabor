import { describe, expect, it } from 'vitest';
import { massesOn, resolveOrdoChoice, writeOrdoChoice } from './ordo-choice';
import { DATE_MAX, DATE_MIN } from './kalendarium';

describe('a dated Ordo occurrence', () => {
	it('resolves a date without requiring a feast name', () => {
		expect(resolveOrdoChoice('2026-12-13')).toEqual({
			date: '2026-12-13',
			mass: 'dominica-iii-adventus'
		});
	});

	it.each(['2026-08-19', '1970-01-01', '2200-01-01'])(
		'keeps an unsupported date %s without substituting another Mass',
		(date) => {
			expect(resolveOrdoChoice(date)).toEqual({ date, mass: null });
			expect(massesOn(date)).toEqual([]);
		}
	);

	it.each(['', 'dominica-i-adventus', '2026-02-30', '2026-13-01', '2026-2-01'])(
		'rejects a non-date %s',
		(date) => {
			expect(resolveOrdoChoice(date)).toBeNull();
		}
	);

	it.each([DATE_MIN, DATE_MAX, '2028-02-29'])('accepts a real date %s', (date) => {
		expect(resolveOrdoChoice(date)?.date).toBe(date);
	});

	it('keeps Christmas Mass variants on December 25', () => {
		expect(massesOn('2026-12-25').map((day) => day.id)).toEqual([
			'nativitas-domini-in-nocte',
			'nativitas-domini-in-aurora',
			'nativitas-domini-in-die'
		]);
		expect(resolveOrdoChoice('2026-12-25')?.mass).toBe('nativitas-domini-in-die');
		expect(resolveOrdoChoice('2026-12-25', 'nativitas-domini-in-nocte')).toEqual({
			date: '2026-12-25',
			mass: 'nativitas-domini-in-nocte'
		});
	});

	it('allows only the Masses of the actual occurrence, including transferred All Souls', () => {
		expect(massesOn('2026-11-02')).toHaveLength(3);
		expect(massesOn('2031-11-03')).toHaveLength(3);
		expect(massesOn('2031-11-02').some((day) => day.id.startsWith('commemoratio-omnium'))).toBe(
			false
		);
		expect(massesOn('2026-12-13')).toHaveLength(1);
		expect(resolveOrdoChoice('2026-12-13', 'nativitas-domini-in-nocte')).toBeNull();
		expect(resolveOrdoChoice('2026-08-19', 'dominica-xii-post-pentecosten')).toBeNull();
	});

	it.each([
		['2026-12-25', 'nativitas-domini-in-nocte', 'nativitas-domini-in-nocte'],
		['2026-12-25', 'nativitas-domini-in-die', null],
		['2026-12-25', null, 'none'],
		['2026-08-19', null, 'none']
	])('round-trips %s / %s without losing independent URL selections', (date, mass, parameter) => {
		const url = new URL('https://example.test/app/pl/ordo?missa=old&w=w012#verse');
		writeOrdoChoice(url, { date: date!, mass });
		expect(url.searchParams.get('dies')).toBe(date);
		expect(url.searchParams.get('missa')).toBe(parameter);
		expect(url.searchParams.get('w')).toBe('w012');
		expect(url.hash).toBe('#verse');
		expect(resolveOrdoChoice(url.searchParams.get('dies')!, url.searchParams.get('missa'))).toEqual(
			{ date, mass }
		);
	});
});

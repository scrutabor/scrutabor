// Compare actual emitted selection membership to the independent calendar/catalogue inputs.
import { describe, expect, it } from 'vitest';
import calendar from './data/calendar.json';
import formularies from './data/formularies.json';
import canon from './data/canon.json';
import dismissal from './data/dismissal.json';

type Selection = { masses: string[]; pairs: (string | number)[][] };
const expected = Object.values(calendar.years)
	.flatMap((days) =>
		days.flatMap(([date, key]) =>
			formularies.formularies
				.filter((form) => form.calendar.key === calendar.formularies[Number(key)])
				.map((form) => [String(date), form.id])
		)
	)
	.sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
const membership = (table: Selection) =>
	table.pairs
		.map(([date, mass]) => [String(date), table.masses[Number(mass)]])
		.sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
const tables = [
	['canon', canon],
	['dismissal', dismissal]
] as const;

describe('source calendar membership of dated variant tables', () => {
	it.each(tables)(
		'%s retains every represented pair including all 72 Vigil dates',
		(_name, table) => {
			expect(expected).toHaveLength(7682);
			expect(new Set(expected.map((row) => JSON.stringify(row))).size).toBe(7682);
			expect(expected.filter(([, mass]) => mass === 'vigilia-ascensionis')).toHaveLength(72);
			expect(membership(table)).toEqual(expected);
		}
	);
	it.each(tables)(
		'%s detects a missing Vigil pair and recovers the exact original',
		(_name, table) => {
			const saved = JSON.stringify(table);
			const changed = structuredClone(table);
			const index = changed.pairs.findIndex(
				([, mass]) => changed.masses[Number(mass)] === 'vigilia-ascensionis'
			);
			expect(index).toBeGreaterThanOrEqual(0);
			const removed = changed.pairs.splice(index, 1);
			expect(membership(changed)).not.toEqual(expected);
			changed.pairs.splice(index, 0, removed[0]);
			expect(membership(changed)).toEqual(expected);
			expect(JSON.stringify(changed)).toBe(saved);
			expect(JSON.stringify(table)).toBe(saved);
		}
	);
});

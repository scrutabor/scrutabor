import { describe, expect, it } from 'vitest';
import table from './data/commemorationes.json';
import { commemorationName, createCommemorationLookup } from './commemorationes';
import { dayById } from './proprium';

const VIGIL = 'vigilia-ascensionis';
const IMPEDED = 'vigilia-ascensionis-impedita';
const QUEENSHIP = 'beata-maria-virgo-regina';
const COLLISIONS = [
	['2067-05-11', 'sanctorum-philippi-et-iacobi-apostolorum'],
	['2078-05-11', 'sanctorum-philippi-et-iacobi-apostolorum'],
	['2079-05-31', QUEENSHIP],
	['2089-05-11', 'sanctorum-philippi-et-iacobi-apostolorum']
] as const;

describe('the source-selected weekday Vigil transport', () => {
	it('keeps four ordinary collisions and both described sung outcomes', () => {
		const lookup = createCommemorationLookup(table);
		expect(lookup.datesOf(IMPEDED).map(({ date, mass }) => [date, mass])).toEqual(COLLISIONS);
		for (const [date, mass] of COLLISIONS) {
			for (const situation of ['lecta', 'cantu-conventualis'] as const) {
				const plan = lookup.plan(date, mass, situation);
				expect(
					plan.admitted.map(({ commemoration, formulary }) => [commemoration.id, formulary])
				).toEqual([[IMPEDED, VIGIL]]);
				expect(plan.unavailable).toEqual([]);
				expect(plan.missing).toEqual([]);
			}
			expect(lookup.plan(date, mass, 'cantu-non-conventualis')).toEqual({
				admitted: [],
				unavailable: [],
				missing: []
			});
		}
	});

	it('uses the actual Vigil title in either language, not the EasterV title', () => {
		const day = dayById(VIGIL);
		expect(day).toBeDefined();
		for (const language of ['pl', 'en'] as const)
			expect(commemorationName(IMPEDED, VIGIL, language)).toBe(day!.title[language]);
	});

	it('retains an addressed lower saint without inferring non-conventual admission', () => {
		const lookup = createCommemorationLookup(table);
		const low = lookup.plan('2026-05-13', VIGIL, 'lecta');
		expect(low.admitted).toHaveLength(1);
		expect(low.admitted[0].formulary).toBeNull();
		expect(low.admitted[0].commemoration.resolved).toBe(false);
		expect(low.admitted[0].texts).toHaveLength(3);
		expect(lookup.plan('2026-05-13', VIGIL, 'cantu-conventualis')).toEqual(low);
		expect(lookup.plan('2026-05-13', VIGIL, 'cantu-non-conventualis')).toEqual({
			admitted: [],
			unavailable: [],
			missing: []
		});
		expect(
			lookup
				.resolve('2079-05-31', QUEENSHIP)
				.find(({ commemoration }) => commemoration.id === 'sancta-petronilla')?.decisions
		).toEqual({
			lecta: 'not-admitted',
			'cantu-conventualis': 'not-admitted',
			'cantu-non-conventualis': 'not-admitted'
		});
	});

	it.each(['unavailable', 'foreign-formulary'] as const)(
		'rejects %s on the admitted resolved Vigil and retains healthy recovery',
		(damage) => {
			expect(createCommemorationLookup(table).datesOf(IMPEDED)).toHaveLength(4);
			const broken = structuredClone(table);
			const row = broken.pairs.find((pair) => pair[0] === '2079-05-31' && pair[7] === VIGIL)!;
			if (damage === 'unavailable') {
				row[4] = row[5] = 2;
				expect(() => createCommemorationLookup(broken)).toThrow(
					'commemoration decisions outside the contract'
				);
			} else {
				row[7] = 'unrepresented-vigil-formulary';
				expect(() => createCommemorationLookup(broken)).toThrow(
					'commemoration resolution names no authored Mass'
				);
			}
			expect(createCommemorationLookup(table).datesOf(IMPEDED)).toHaveLength(4);
		}
	);
});

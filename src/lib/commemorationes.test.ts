import { describe, expect, it } from 'vitest';
import table from './data/commemorationes.json';
import {
	COMMEMORATION_DECLARATIONS,
	COMMEMORATION_TEXT_KEYS,
	compareTypedRows,
	createCommemorationLookup,
	selectedCommemorations,
	SEPARATE_CONCLUSIONS,
	SITUATIONS,
	validateCommemorationPack,
	type Situation
} from './commemorationes';
import { commemorationData } from './loaders';
import { commemorationTitle } from './corpus-metadata';

const COLLECT = 'proprium/litaniae-maiores-collecta';
const SECRET = 'proprium/dominica-i-passionis-secreta';
const POSTCOMMUNION = 'proprium/litaniae-maiores-postcommunio';
const PETRONILLA = [
	'proprium/sanctae-petronillae-collecta',
	'proprium/sanctae-petronillae-secreta',
	'proprium/sanctae-petronillae-postcommunio'
];
const QUEENSHIP = 'beata-maria-virgo-regina';
const MARK = 'sancti-marci-evangelistae';

type Table = typeof table;
const rows = (value: Table) => value.pairs as (string | number | boolean)[][];
const petronillaPair = (value: Table) => rows(value).findIndex((row) => row[2] === 1);

describe('corpus-owned commemoration occurrences and decisions (selection 2.0.0)', () => {
	it('declares every slot body once, after the Mass role each follows', () => {
		expect(COMMEMORATION_DECLARATIONS).toEqual([
			{ key: COLLECT, slot: 'collecta' },
			{ key: SECRET, slot: 'secreta' },
			{ key: POSTCOMMUNION, slot: 'postcommunio' },
			{ key: PETRONILLA[0], slot: 'collecta' },
			{ key: PETRONILLA[1], slot: 'secreta' },
			{ key: PETRONILLA[2], slot: 'postcommunio' }
		]);
		expect(COMMEMORATION_TEXT_KEYS).toEqual([COLLECT, SECRET, POSTCOMMUNION, ...PETRONILLA]);
		expect(commemorationTitle('litaniae-maiores', 'pl')).toBe('Litanie Większe');
		expect(commemorationTitle('litaniae-maiores', 'en')).toBe('Greater Litanies');
		expect(commemorationTitle('sancta-petronilla', 'pl')).toBe('Świętej Petroneli, Dziewicy');
		expect(commemorationTitle('sancta-petronilla', 'en')).toBe('Saint Petronilla, Virgin');
		const lookup = createCommemorationLookup(table);
		expect(lookup.commemorations.map(({ id, title, rank }) => [id, title, rank])).toEqual([
			['litaniae-maiores', 'Litaniæ maiores', 'privileged'],
			['sancta-petronilla', 'S. Petronillæ Virginis', 'ordinary']
		]);
	});
	it('resolves every published pair with its three decisions and publishes every occurrence', () => {
		const lookup = createCommemorationLookup(table);
		expect(table.occurrences).toHaveLength(152);
		expect(table.pairs).toHaveLength(107);
		for (const [date, mass, index, profile, ...plan] of table.pairs) {
			const found = lookup.resolve(String(date), table.masses[Number(mass)]);
			expect(found).toEqual([
				{
					commemoration: lookup.commemorations[Number(index)],
					profile: table.profiles[Number(profile)],
					decisions: Object.fromEntries(
						SITUATIONS.map((situation, at) => [situation, table.decisions[Number(plan[at])].id])
					)
				}
			]);
			expect(found[0].profile.id).toBe(SEPARATE_CONCLUSIONS);
		}
		for (const [date, index] of table.occurrences)
			expect(lookup.occurrencesOn(String(date))).toContain(lookup.commemorations[Number(index)]);
	});
	const plans: [string, string, Record<Situation, string[]>, Record<Situation, string[]>][] = [
		[
			'2026-04-25',
			MARK,
			{
				lecta: ['litaniae-maiores'],
				'cantu-conventualis': ['litaniae-maiores'],
				'cantu-non-conventualis': ['litaniae-maiores']
			},
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2027-05-31',
			QUEENSHIP,
			{
				lecta: ['sancta-petronilla'],
				'cantu-conventualis': ['sancta-petronilla'],
				'cantu-non-conventualis': []
			},
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2079-05-31',
			QUEENSHIP,
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] },
			{
				lecta: ['sancta-petronilla'],
				'cantu-conventualis': ['sancta-petronilla'],
				'cantu-non-conventualis': []
			}
		],
		[
			'2026-05-31',
			'sanctissimae-trinitatis',
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] },
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		]
	];
	it.each(plans)(
		'%s / %s: each situation has its own plan',
		(date, mass, admitted, unavailable) => {
			const lookup = createCommemorationLookup(table);
			for (const situation of SITUATIONS) {
				const plan = lookup.plan(date, mass, situation);
				expect(
					plan.admitted.map(({ commemoration }) => commemoration.id),
					situation
				).toEqual(admitted[situation]);
				expect(
					plan.unavailable.map(({ id }) => id),
					situation
				).toEqual(unavailable[situation]);
			}
		}
	);
	it('marks exactly one Mass as owing an unavailable de Tempore commemoration', () => {
		const marked = table.pairs.filter((row) => row.slice(4).includes(2));
		expect(marked).toEqual([['2079-05-31', table.masses.indexOf(QUEENSHIP), 1, 0, 2, 2, 1]]);
	});
	it.each([
		['2026-04-25', MARK, 1],
		['2027-04-25', 'dominica-iv-post-pascha', 1],
		['2049-04-25', 'dominica-in-albis', 1],
		['2027-05-31', QUEENSHIP, 1],
		['2026-05-31', 'sanctissimae-trinitatis', 0],
		['2026-04-26', 'dominica-iv-post-pascha', 0],
		['2026-04-19', 'dominica-ii-post-pascha', 0]
	])('%s / %s publishes %i decision(s)', (date, mass, count) => {
		expect(createCommemorationLookup(table).resolve(date, mass)).toHaveLength(count);
	});
	it.each(['2030-04-25', '2038-04-27', '2095-04-26'])(
		'%s is an acknowledged occurrence with no represented Mass',
		(date) => {
			const lookup = createCommemorationLookup(table);
			expect(lookup.occurrencesOn(date).map(({ id }) => id)).toEqual(['litaniae-maiores']);
			expect(table.pairs.some((row) => row[0] === date)).toBe(false);
		}
	);
	it('acknowledges St Petronilla on a first-class Sunday without a decision for its Mass', () => {
		const lookup = createCommemorationLookup(table);
		expect(lookup.occurrencesOn('2026-05-31').map(({ id }) => id)).toEqual(['sancta-petronilla']);
		expect(table.pairs.some((row) => row[0] === '2026-05-31')).toBe(false);
	});
	it.each(['2038-04-25', '2095-04-25'])(
		'%s is not an occurrence (Easter Sunday or Monday)',
		(date) => expect(createCommemorationLookup(table).occurrencesOn(date)).toEqual([])
	);
	it.each([
		['2026-04-25', 'none'],
		['2026-04-25', 'unknown'],
		['2026-4-25', MARK]
	])('rejects an unsupported choice instead of answering: %s / %s', (date, mass) => {
		const lookup = createCommemorationLookup(table);
		expect(() => lookup.resolve(date, mass)).toThrow();
		expect(() => lookup.plan(date, mass, 'lecta')).toThrow();
	});
	it('rejects an unknown situation', () =>
		expect(() =>
			createCommemorationLookup(table).plan('2026-04-25', MARK, 'cantu' as Situation)
		).toThrow());
	const mutations: [string, (value: Table) => void, RegExp?][] = [
		[
			'the previous selection version',
			(v) => {
				v.schema_version = '1.0.0';
			}
		],
		[
			'profile',
			(v) => {
				v.profiles[0].id = 'single-conclusion';
			}
		],
		[
			'situation order',
			(v) => {
				v.situations.reverse();
			}
		],
		[
			'decision vocabulary',
			(v) => {
				v.decisions[2].id = 'omitted';
			}
		],
		[
			'slot order',
			(v) => {
				v.commemorations[0].slots.reverse();
			}
		],
		[
			'unknown body',
			(v) => {
				v.commemorations[0].slots[0].text = 'proprium/litaniae-maiores-oratio';
			}
		],
		[
			'pair off occurrence',
			(v) => {
				v.pairs.push(['2101-12-31', 0, 0, 0, 0, 0, 0]);
			}
		],
		[
			'duplicate pair',
			(v) => {
				v.pairs.push([...v.pairs[v.pairs.length - 1]]);
			}
		],
		[
			'unknown Mass',
			(v) => {
				v.masses[0] = 'missa-ignota';
			}
		],
		[
			'missing Mass',
			(v) => {
				v.masses.pop();
			}
		],
		[
			'noncanonical date',
			(v) => {
				v.occurrences[0][0] = '2026-4-25';
			}
		],
		[
			'unordered occurrences',
			(v) => {
				v.occurrences.reverse();
			}
		],
		[
			'empty title',
			(v) => {
				v.commemorations[0].title = '';
			}
		],
		[
			'extra field',
			(v) => {
				(v as unknown as Record<string, unknown>).fallback = true;
			}
		],
		[
			'a 1.0.0 pair row without decisions',
			(v) => {
				v.pairs[0] = v.pairs[0].slice(0, 4);
			}
		],
		[
			'a boolean index',
			(v) => {
				rows(v)[0][2] = false;
			}
		],
		[
			'a decision outside the vocabulary',
			(v) => {
				v.pairs[0][6] = 3;
			}
		],
		[
			'a privileged commemoration not made in a sung Mass that is not conventual',
			(v) => {
				v.pairs[0][6] = 1;
			},
			/outside the contract/
		],
		[
			'an ordinary commemoration admitted in a sung Mass that is not conventual',
			(v) => {
				v.pairs[petronillaPair(v)][6] = 0;
			},
			/outside the contract/
		],
		[
			'an ordinary commemoration decided apart in a low and a sung conventual Mass',
			(v) => {
				v.pairs[petronillaPair(v)][5] = 1;
			},
			/outside the contract/
		],
		[
			'a second admitted commemoration in one situation',
			(v) => {
				v.occurrences.splice(1, 0, ['2026-04-25', 1]);
				v.pairs.splice(1, 0, ['2026-04-25', table.masses.indexOf(MARK), 1, 0, 0, 0, 1]);
			},
			/more commemorations than the contract models/
		],
		[
			'an admitted commemoration beside an unavailable de Tempore one',
			(v) => {
				v.occurrences.splice(1, 0, ['2026-04-25', 1]);
				v.pairs.splice(1, 0, ['2026-04-25', table.masses.indexOf(MARK), 1, 0, 2, 2, 1]);
			},
			/more commemorations than the contract models/
		]
	];
	it.each(mutations)('rejects a malformed resource: %s', (_name, mutate, message) => {
		const broken = structuredClone(table);
		mutate(broken);
		expect(() => createCommemorationLookup(broken)).toThrow(message ?? /./);
	});
	it('accepts the untouched resource the mutations start from', () =>
		expect(() => createCommemorationLookup(structuredClone(table))).not.toThrow());
});

describe('typed row order', () => {
	// Eleven synthetic commemorations, so that indexes 2 and 10 meet on one date.
	const synthetic = (order: number[], pairs: (string | number)[][] = []) => ({
		...structuredClone(table),
		commemorations: Array.from({ length: 11 }, (_, index) => ({
			...structuredClone(table.commemorations[1]),
			id: `c${String(index).padStart(2, '0')}`
		})),
		occurrences: order.map((index) => ['2026-04-25', index]),
		pairs
	});
	const mark = table.masses.indexOf(MARK);
	it('compares indexes as numbers, where interpolated strings would invert 2 and 10', () => {
		expect(compareTypedRows(['2026-04-25', 2], ['2026-04-25', 10])).toBeLessThan(0);
		expect(compareTypedRows(['2026-04-25', 10], ['2026-04-25', 2])).toBeGreaterThan(0);
		expect(['2026-04-25/2', '2026-04-25/10'].sort()).toEqual(['2026-04-25/10', '2026-04-25/2']);
	});
	it('accepts occurrences in numeric order and rejects the string order', () => {
		const lookup = createCommemorationLookup(synthetic([2, 10]));
		expect(lookup.occurrencesOn('2026-04-25').map(({ id }) => id)).toEqual(['c02', 'c10']);
		expect(() => createCommemorationLookup(synthetic([10, 2]))).toThrow(/unordered occurrence/);
	});
	it('accepts pairs in numeric order and rejects the string order', () => {
		const second = ['2026-04-25', mark, 2, 0, 1, 1, 1];
		const tenth = ['2026-04-25', mark, 10, 0, 1, 1, 1];
		expect(
			createCommemorationLookup(synthetic([2, 10], [second, tenth])).resolve('2026-04-25', MARK)
		).toHaveLength(2);
		expect(() => createCommemorationLookup(synthetic([2, 10], [tenth, second]))).toThrow(
			/unordered commemoration pair/
		);
	});
});

describe('commemoration transport pack', () => {
	it.each(['pl', 'en'] as const)('%s pack carries exactly the six bodies', async (lang) => {
		const pack = validateCommemorationPack(await commemorationData(lang), lang);
		expect(pack.parts.map(({ key, slot }) => ({ key, slot }))).toEqual(COMMEMORATION_DECLARATIONS);
		const lookup = createCommemorationLookup(table);
		const litanies = selectedCommemorations(
			lookup.plan('2026-04-25', MARK, 'lecta').admitted,
			pack
		);
		expect(litanies.map(({ key, slot, commemoration }) => [key, slot, commemoration])).toEqual([
			[COLLECT, 'collecta', 'litaniae-maiores'],
			[SECRET, 'secreta', 'litaniae-maiores'],
			[POSTCOMMUNION, 'postcommunio', 'litaniae-maiores']
		]);
		const petronilla = selectedCommemorations(
			lookup.plan('2027-05-31', QUEENSHIP, 'cantu-conventualis').admitted,
			pack
		);
		expect(petronilla.map(({ key, slot, commemoration }) => [key, slot, commemoration])).toEqual([
			[PETRONILLA[0], 'collecta', 'sancta-petronilla'],
			[PETRONILLA[1], 'secreta', 'sancta-petronilla'],
			[PETRONILLA[2], 'postcommunio', 'sancta-petronilla']
		]);
		expect(
			selectedCommemorations(
				lookup.plan('2027-05-31', QUEENSHIP, 'cantu-non-conventualis').admitted,
				pack
			)
		).toEqual([]);
		expect(selectedCommemorations([], pack)).toEqual([]);
		expect(() =>
			selectedCommemorations(lookup.plan('2026-04-25', MARK, 'lecta').admitted, null)
		).toThrow();
	});
	it('rejects a pack with a body in the wrong slot', async () => {
		const pack = structuredClone(await commemorationData('en')) as { parts: { slot: string }[] };
		pack.parts[0].slot = 'secreta';
		expect(() => validateCommemorationPack(pack, 'en')).toThrow();
	});
});

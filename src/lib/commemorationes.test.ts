import { describe, expect, it } from 'vitest';
import table from './data/commemorationes.json';
import {
	COMMEMORATION_DECLARATIONS,
	COMMEMORATION_TEXT_KEYS,
	createCommemorationLookup,
	selectedCommemorations,
	SEPARATE_CONCLUSIONS,
	validateCommemorationPack
} from './commemorationes';
import { commemorationData } from './loaders';
import { commemorationTitle } from './corpus-metadata';

const COLLECT = 'proprium/litaniae-maiores-collecta';
const SECRET = 'proprium/dominica-i-passionis-secreta';
const POSTCOMMUNION = 'proprium/litaniae-maiores-postcommunio';

describe('corpus-owned commemoration occurrences and pairs', () => {
	it('declares the three slot bodies once, after the Mass role each follows', () => {
		expect(COMMEMORATION_DECLARATIONS).toEqual([
			{ key: COLLECT, slot: 'collecta' },
			{ key: SECRET, slot: 'secreta' },
			{ key: POSTCOMMUNION, slot: 'postcommunio' }
		]);
		expect(COMMEMORATION_TEXT_KEYS).toEqual([COLLECT, SECRET, POSTCOMMUNION]);
		expect(commemorationTitle('litaniae-maiores', 'pl')).toBe('Litanie Większe');
		expect(commemorationTitle('litaniae-maiores', 'en')).toBe('Greater Litanies');
		expect(createCommemorationLookup(table).commemorations[0].title).toBe('Litaniæ maiores');
	});
	it('resolves every emitted pair and publishes every occurrence', () => {
		const lookup = createCommemorationLookup(table);
		expect(table.occurrences).toHaveLength(76);
		expect(table.pairs).toHaveLength(63);
		for (const [date, mass, index, profile] of table.pairs) {
			const active = lookup.resolve(String(date), table.masses[Number(mass)]);
			expect(active).toEqual([
				{
					commemoration: lookup.commemorations[Number(index)],
					profile: table.profiles[Number(profile)]
				}
			]);
			expect(active[0].profile.id).toBe(SEPARATE_CONCLUSIONS);
		}
		for (const [date, index] of table.occurrences)
			expect(lookup.occurrencesOn(String(date))).toEqual([lookup.commemorations[Number(index)]]);
	});
	it.each([
		['2026-04-25', 'sancti-marci-evangelistae', 1],
		['2027-04-25', 'dominica-iv-post-pascha', 1],
		['2049-04-25', 'dominica-in-albis', 1],
		['2026-04-26', 'dominica-iv-post-pascha', 0],
		['2026-04-19', 'dominica-ii-post-pascha', 0]
	])('%s / %s pairs %i commemoration(s)', (date, mass, count) => {
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
	it.each(['2038-04-25', '2095-04-25'])(
		'%s is not an occurrence (Easter Sunday or Monday)',
		(date) => expect(createCommemorationLookup(table).occurrencesOn(date)).toEqual([])
	);
	it.each([
		['2026-04-25', 'none'],
		['2026-04-25', 'unknown'],
		['2026-4-25', 'sancti-marci-evangelistae']
	])('rejects an unsupported choice instead of answering: %s / %s', (date, mass) =>
		expect(() => createCommemorationLookup(table).resolve(date, mass)).toThrow()
	);
	const mutations: [string, (value: typeof table) => void][] = [
		[
			'version',
			(v) => {
				v.schema_version = '2.0.0';
			}
		],
		[
			'profile',
			(v) => {
				v.profiles[0].id = 'single-conclusion';
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
				v.pairs.push(['2026-04-26', 0, 0, 0]);
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
		]
	];
	it.each(mutations)('rejects a malformed resource: %s', (_name, mutate) => {
		const broken = structuredClone(table);
		mutate(broken);
		expect(() => createCommemorationLookup(broken)).toThrow();
	});
});

describe('commemoration transport pack', () => {
	it.each(['pl', 'en'] as const)('%s pack carries exactly the three bodies', async (lang) => {
		const pack = validateCommemorationPack(await commemorationData(lang), lang);
		expect(pack.parts.map(({ key, slot }) => ({ key, slot }))).toEqual(COMMEMORATION_DECLARATIONS);
		const lookup = createCommemorationLookup(table);
		const bodies = selectedCommemorations(
			lookup.resolve('2026-04-25', 'sancti-marci-evangelistae'),
			pack
		);
		expect(bodies.map(({ key, slot, commemoration }) => [key, slot, commemoration])).toEqual([
			[COLLECT, 'collecta', 'litaniae-maiores'],
			[SECRET, 'secreta', 'litaniae-maiores'],
			[POSTCOMMUNION, 'postcommunio', 'litaniae-maiores']
		]);
		expect(selectedCommemorations([], pack)).toEqual([]);
		expect(() =>
			selectedCommemorations(lookup.resolve('2026-04-25', 'sancti-marci-evangelistae'), null)
		).toThrow();
	});
	it('rejects a pack with a body in the wrong slot', async () => {
		const pack = structuredClone(await commemorationData('en')) as { parts: { slot: string }[] };
		pack.parts[0].slot = 'secreta';
		expect(() => validateCommemorationPack(pack, 'en')).toThrow();
	});
});

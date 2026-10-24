import { describe, expect, it } from 'vitest';
import table from './data/commemorationes.json';
import {
	COMMEMORATION_DECLARATIONS,
	COMMEMORATION_TEXT_KEYS,
	commemorationName,
	compareTypedRows,
	createCommemorationLookup,
	formularyOrations,
	orationBodies,
	RESOLVED_HEADINGS,
	selectedCommemorations,
	SEPARATE_CONCLUSIONS,
	SITUATIONS,
	validateCommemorationPack,
	type Situation
} from './commemorationes';
import {
	commemorationData,
	commemorationPageData,
	properData,
	RESOLVED_FEAST_ORDER,
	RESOLVED_FEAST_SIDE
} from './loaders';
import type { TextDocument } from './corpus';
import { commemorationTitle, FORMULARY_METADATA } from './corpus-metadata';
import { M } from './i18n';
import { dayOn } from './kalendarium';
import { PROPER_DAYS } from './proprium';

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
const ALL_SAINTS = 'omnium-sanctorum';
const ASSUMPTION = 'assumptio-beatae-mariae-virginis';
const XXIII = 'dominica-xxiii-post-pentecosten';
const XIII = 'dominica-xiii-post-pentecosten';
// RG 18: the Fourth Sunday after Epiphany resumed in November, said by its own formulary.
const RESUMED = 'dominica-iv-quae-superfuit-post-epiphaniam';
const IMPEDED = 'dominica-impedita';
const FERIA = 'feria-adventus';
const FESTUM = 'festum-impeditum';
const LITANIES = 'litaniae-maiores';
// The Advent feria: three feasts on a weekday of Advent say the preceding Sunday's orations as
// the weekday's, except on the Ember days, whose own Mass this edition does not yet author.
const ANDREW = 'sancti-andreae-apostoli';
const IMMACULATE = 'immaculata-conceptio';
const THOMAS = 'sancti-thomae-apostoli';
const ADVENT_SUNDAYS = ['i', 'ii', 'iii', 'iv'].map((week) => `dominica-${week}-adventus`);
const EMBER_FRIDAY = 'feria-sexta-quatuor-temporum-adventus';
const EMBER_SATURDAY = 'sabbato-quatuor-temporum-adventus';
const ST_PETRONILLA = 'sancta-petronilla';
// The impeded feast: two second-class feasts, each kept off its day by a second-class Sunday.
const OCTAVE = 'dominica-infra-octavam-nativitatis';
const ST_JOHN = 'sancti-ioannis-apostoli-et-evangelistae';
const X = 'dominica-x-post-pentecosten';
const ST_JAMES = 'sancti-iacobi-apostoli';
const CHAIR = 'cathedra-sancti-petri';
const NATIVITY_BVM = 'nativitas-beatae-mariae-virginis';
const VISITATION_POSTCOMMUNION = 'proprium/visitatio-beatae-mariae-virginis-postcommunio';
const IMPEDED_FEASTS = [
	QUEENSHIP,
	'visitatio-beatae-mariae-virginis',
	ST_JAMES,
	'sanctae-annae-matris-beatae-mariae-virginis',
	'sancti-laurentii-martyris',
	'sancti-ioachim-confessoris',
	'immaculatum-cor-beatae-mariae-virginis',
	'sancti-bartholomaei-apostoli',
	NATIVITY_BVM,
	'septem-dolorum-beatae-mariae-virginis',
	'sancti-matthaei-apostoli-et-evangelistae',
	'beatae-mariae-virginis-a-rosario',
	'maternitas-beatae-mariae-virginis',
	'sancti-lucae-evangelistae',
	'sancti-stephani-protomartyris',
	ST_JOHN,
	'sanctorum-innocentium-martyrum',
	CHAIR,
	'sancti-matthiae-apostoli',
	'sanctorum-philippi-et-iacobi-apostolorum'
];
// The catalogue page lists the same twenty feasts in civil order, from the Chair of St Peter.
const IMPEDED_FEASTS_CIVIL = [
	CHAIR,
	'sancti-matthiae-apostoli',
	'sanctorum-philippi-et-iacobi-apostolorum',
	QUEENSHIP,
	'visitatio-beatae-mariae-virginis',
	ST_JAMES,
	'sanctae-annae-matris-beatae-mariae-virginis',
	'sancti-laurentii-martyris',
	'sancti-ioachim-confessoris',
	'immaculatum-cor-beatae-mariae-virginis',
	'sancti-bartholomaei-apostoli',
	NATIVITY_BVM,
	'septem-dolorum-beatae-mariae-virginis',
	'sancti-matthaei-apostoli-et-evangelistae',
	'beatae-mariae-virginis-a-rosario',
	'maternitas-beatae-mariae-virginis',
	'sancti-lucae-evangelistae',
	'sancti-stephani-protomartyris',
	ST_JOHN,
	'sanctorum-innocentium-martyrum'
];
const ADMITTED = table.decisions.findIndex(({ id }) => id === 'admitted');
const NOT_ADMITTED = table.decisions.findIndex(({ id }) => id === 'not-admitted');
const UNAVAILABLE = table.decisions.findIndex(
	({ id }) => id === 'omitted-required-de-tempore-unavailable'
);

type Table = typeof table;
type Row = (string | number | boolean | null)[];
const rows = (value: Table) => value.pairs as Row[];
/** A commemoration's position in a resource, found by its identity, never assumed. */
const at = (value: Table, id: string) =>
	value.commemorations.findIndex((commemoration) => commemoration.id === id);
const entry = (value: Table, id: string) => value.commemorations[at(value, id)];
/** One slot of a commemoration, typed for a mutation that may give it a text or take it away. */
const slotOf = (value: Table, id: string, index: number) =>
	entry(value, id).slots[index] as { text: string | null };
const pairOf = (value: Table, id: string, date?: string) =>
	rows(value).findIndex((row) => row[2] === at(value, id) && (!date || row[0] === date));
/** Insert a commemoration's occurrence and pair right after another's on the same date, so the
 * typed row order holds and only the rule under test can reject the resource. */
const beside = (value: Table, after: string, date: string, added: string, row: Row) => {
	const occurrence = value.occurrences.findIndex(
		([day, index]) => day === date && index === at(value, after)
	);
	value.occurrences.splice(occurrence + 1, 0, [date, at(value, added)]);
	rows(value).splice(pairOf(value, after, date) + 1, 0, row);
};
const components = (id: string) => FORMULARY_METADATA.find((form) => form.id === id)!.components;

describe('corpus-owned commemoration occurrences and decisions (selection 2.1.0)', () => {
	it('declares every addressed slot body once, after the Mass role each follows', () => {
		expect(COMMEMORATION_DECLARATIONS).toEqual([
			{ key: COLLECT, slot: 'collecta' },
			{ key: SECRET, slot: 'secreta' },
			{ key: POSTCOMMUNION, slot: 'postcommunio' },
			{ key: PETRONILLA[0], slot: 'collecta' },
			{ key: PETRONILLA[1], slot: 'secreta' },
			{ key: PETRONILLA[2], slot: 'postcommunio' }
		]);
		expect(COMMEMORATION_TEXT_KEYS).toEqual([COLLECT, SECRET, POSTCOMMUNION, ...PETRONILLA]);
		expect(commemorationTitle(IMPEDED, 'pl')).toBe('Niedziela przeszkodzona');
		expect(commemorationTitle(IMPEDED, 'en')).toBe('Impeded Sunday');
		expect(commemorationTitle(FERIA, 'pl')).toBe('Dzień powszedni Adwentu');
		expect(commemorationTitle(FERIA, 'en')).toBe('Weekday of Advent');
		expect(commemorationTitle(FESTUM, 'pl')).toBe('Święto przeszkodzone');
		expect(commemorationTitle(FESTUM, 'en')).toBe('Impeded Feast');
		expect(commemorationTitle(LITANIES, 'pl')).toBe('Litanie Większe');
		expect(commemorationTitle(LITANIES, 'en')).toBe('Greater Litanies');
		expect(commemorationTitle(ST_PETRONILLA, 'pl')).toBe('Świętej Petroneli, Dziewicy');
		expect(commemorationTitle(ST_PETRONILLA, 'en')).toBe('Saint Petronilla, Virgin');
		const lookup = createCommemorationLookup(table);
		expect(
			lookup.commemorations.map(({ id, title, rank, resolved }) => [id, title, rank, resolved])
		).toEqual([
			[IMPEDED, 'Dominica impedita', 'privileged', true],
			[FERIA, 'Feria Adventus', 'privileged', true],
			[FESTUM, 'Festum impeditum', 'ordinary', true],
			[LITANIES, 'Litaniæ maiores', 'privileged', false],
			[ST_PETRONILLA, 'S. Petronillæ Virginis', 'ordinary', false]
		]);
		// The wire format orders commemorations by identity, so the Advent feria sorts second and
		// moves the impeded feast to index 2, the Litanies to 3 and St Petronilla to 4. The app
		// addresses none of them by position; this pins only where the resource puts them.
		expect([IMPEDED, FERIA, FESTUM, LITANIES, ST_PETRONILLA].map((id) => at(table, id))).toEqual([
			0, 1, 2, 3, 4
		]);
		// No resolved commemoration says a text of its own in any slot.
		for (const id of [IMPEDED, FERIA, FESTUM])
			expect(
				entry(table, id).slots.map(({ key, after, text }) => [key, after, text]),
				id
			).toEqual([
				['collecta', 'collecta', null],
				['secreta', 'secreta', null],
				['postcommunio', 'postcommunio', null]
			]);
	});
	it('resolves every published pair with its decisions and publishes every occurrence', () => {
		const lookup = createCommemorationLookup(table);
		expect(table.occurrences).toHaveLength(596);
		expect(table.pairs).toHaveLength(551);
		for (const [id, pairs, occurrences] of [
			[IMPEDED, 75, 75],
			[FERIA, 163, 163],
			[FESTUM, 206, 206],
			[LITANIES, 63, 76],
			[ST_PETRONILLA, 44, 76]
		] as const) {
			expect(
				table.pairs.filter((row) => row[2] === at(table, id)),
				id
			).toHaveLength(pairs);
			expect(
				table.occurrences.filter((row) => row[1] === at(table, id)),
				id
			).toHaveLength(occurrences);
			expect(lookup.datesOf(id), id).toHaveLength(pairs);
		}
		for (const row of rows(table)) {
			const [date, mass, index, profile, ...rest] = row;
			const plan = rest.slice(0, SITUATIONS.length);
			const found = lookup.resolve(String(date), table.masses[Number(mass)]);
			expect(found).toEqual([
				{
					commemoration: lookup.commemorations[Number(index)],
					profile: table.profiles[Number(profile)],
					formulary: rest[SITUATIONS.length],
					decisions: Object.fromEntries(
						SITUATIONS.map((situation, place) => [
							situation,
							table.decisions[Number(plan[place])].id
						])
					)
				}
			]);
			expect(found[0].profile.id).toBe(SEPARATE_CONCLUSIONS);
			// A pair names a formulary exactly when its commemoration is resolved per pair.
			expect(typeof rest[SITUATIONS.length] === 'string').toBe(found[0].commemoration.resolved);
		}
		for (const [date, index] of table.occurrences)
			expect(lookup.occurrencesOn(String(date))).toContain(lookup.commemorations[Number(index)]);
		expect(() => lookup.datesOf('dominica-ignota')).toThrow(/unknown commemoration/);
	});
	const plans: [string, string, Record<Situation, string[]>, Record<Situation, string[]>][] = [
		[
			'2026-04-25',
			MARK,
			{
				lecta: [LITANIES],
				'cantu-conventualis': [LITANIES],
				'cantu-non-conventualis': [LITANIES]
			},
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2027-05-31',
			QUEENSHIP,
			{
				lecta: [ST_PETRONILLA],
				'cantu-conventualis': [ST_PETRONILLA],
				'cantu-non-conventualis': []
			},
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2079-05-31',
			QUEENSHIP,
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] },
			{
				lecta: [ST_PETRONILLA],
				'cantu-conventualis': [ST_PETRONILLA],
				'cantu-non-conventualis': []
			}
		],
		[
			'2026-05-31',
			'sanctissimae-trinitatis',
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] },
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2026-11-01',
			ALL_SAINTS,
			{
				lecta: [IMPEDED],
				'cantu-conventualis': [IMPEDED],
				'cantu-non-conventualis': [IMPEDED]
			},
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2026-12-27',
			OCTAVE,
			{ lecta: [FESTUM], 'cantu-conventualis': [FESTUM], 'cantu-non-conventualis': [] },
			{ lecta: [], 'cantu-conventualis': [], 'cantu-non-conventualis': [] }
		],
		[
			'2027-07-25',
			X,
			{ lecta: [FESTUM], 'cantu-conventualis': [FESTUM], 'cantu-non-conventualis': [] },
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
				expect(plan.missing, situation).toEqual([]);
			}
		}
	);
	it('marks exactly one Mass as omitting a commemoration for an unavailable de Tempore one', () => {
		const marked = table.pairs.filter((row) => row.slice(4, 4 + SITUATIONS.length).includes(2));
		// Since 6.4.0 the Advent feria, itself the de Tempore commemoration, is also owed and
		// unavailable, on the 21 Ember days of Advent that St Thomas meets (its describe below).
		expect(marked.filter((row) => row[2] !== at(table, FERIA))).toEqual([
			['2079-05-31', table.masses.indexOf(QUEENSHIP), at(table, ST_PETRONILLA), 0, 2, 2, 1, null]
		]);
		expect(marked.filter((row) => row[2] === at(table, FERIA))).toHaveLength(21);
	});
	it.each([
		['2026-04-25', MARK, 1],
		['2027-04-25', 'dominica-iv-post-pascha', 1],
		['2049-04-25', 'dominica-in-albis', 1],
		['2027-05-31', QUEENSHIP, 1],
		['2026-05-31', 'sanctissimae-trinitatis', 0],
		['2026-04-26', 'dominica-iv-post-pascha', 0],
		['2026-04-19', 'dominica-ii-post-pascha', 0],
		['2026-11-01', ALL_SAINTS, 1],
		['2027-11-01', ALL_SAINTS, 0],
		['2027-08-15', ASSUMPTION, 1],
		['2026-08-15', ASSUMPTION, 0],
		['2026-12-27', OCTAVE, 1],
		['2027-12-27', ST_JOHN, 0],
		['2027-07-25', X, 1],
		['2026-07-25', ST_JAMES, 0],
		['2026-11-30', ANDREW, 1],
		['2026-12-08', IMMACULATE, 1],
		['2029-12-21', THOMAS, 1],
		['2025-11-30', ADVENT_SUNDAYS[0], 0]
	])('%s / %s publishes %i decision(s)', (date, mass, count) => {
		expect(createCommemorationLookup(table).resolve(date, mass)).toHaveLength(count);
	});
	it.each(['2030-04-25', '2038-04-27', '2095-04-26'])(
		'%s is an acknowledged occurrence with no represented Mass',
		(date) => {
			const lookup = createCommemorationLookup(table);
			expect(lookup.occurrencesOn(date).map(({ id }) => id)).toEqual([LITANIES]);
			expect(table.pairs.some((row) => row[0] === date)).toBe(false);
		}
	);
	it('acknowledges St Petronilla on a first-class Sunday without a decision for its Mass', () => {
		const lookup = createCommemorationLookup(table);
		expect(lookup.occurrencesOn('2026-05-31').map(({ id }) => id)).toEqual([ST_PETRONILLA]);
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
});

describe('the impeded Sunday, resolved per pair', () => {
	const lookup = createCommemorationLookup(table);
	it('commemorates the displaced Sunday in every Mass of the seven feasts', () => {
		const dates = lookup.datesOf(IMPEDED);
		expect(dates).toHaveLength(75);
		expect(dates.map(({ date }) => date)).toEqual(dates.map(({ date }) => date).sort());
		expect(
			PROPER_DAYS.map(({ id }) => id).filter((id) => dates.some(({ mass }) => mass === id))
		).toEqual([
			'nativitas-sancti-ioannis-baptistae',
			'sancti-petri-et-pauli-apostolorum',
			ASSUMPTION,
			'dedicatio-sancti-michaelis-archangeli',
			ALL_SAINTS,
			'immaculata-conceptio',
			'sancti-ioseph-opificis'
		]);
		expect(new Set(dates.map(({ formulary }) => formulary)).size).toBe(22);
		for (const { date, mass, formulary, decisions } of dates) {
			expect(new Date(`${date}T12:00:00`).getDay(), date).toBe(0);
			expect(Object.values(decisions), date).toEqual(['admitted', 'admitted', 'admitted']);
			for (const situation of SITUATIONS) {
				const [made] = lookup.plan(date, mass, situation).admitted;
				expect(made.formulary, date).toBe(formulary);
				// The three orations the Sunday's own formulary assembles, by role.
				expect(made.texts, date).toEqual(formularyOrations(components(formulary!)));
			}
		}
	});
	it.each([
		['2026-11-01', ALL_SAINTS, XXIII],
		['2027-08-15', ASSUMPTION, XIII],
		['2030-12-08', 'immaculata-conceptio', 'dominica-ii-adventus']
	])('%s / %s commemorates %s', (date, mass, sunday) => {
		const [made] = lookup.plan(date, mass, 'lecta').admitted;
		expect(made.commemoration.id).toBe(IMPEDED);
		expect(made.formulary).toBe(sunday);
		expect(made.texts).toEqual([
			`proprium/${sunday}-collecta`,
			`proprium/${sunday}-secreta`,
			`proprium/${sunday}-postcommunio`
		]);
	});
	it.each(['2043-11-01', '2054-11-01', '2065-11-01'])(
		'%s (RG 18) commemorates the resumed Fourth Sunday after Epiphany, not the calendar position',
		(date) => {
			expect(dayOn(date)?.formulary).toBe(ALL_SAINTS);
			expect(dayOn(date)?.position).toBe('dominica-xxiv-post-pentecosten');
			const [decision] = lookup.resolve(date, ALL_SAINTS);
			expect(decision.commemoration.id).toBe(IMPEDED);
			expect(decision.formulary).toBe(RESUMED);
			// Its formulary transfers the Fourth Sunday after Epiphany's orations by reference.
			const orations = components(RESUMED).filter(({ role }) =>
				['collecta', 'secreta', 'postcommunio'].includes(role)
			);
			expect(orations.map(({ relation }) => relation)).toEqual([
				'reference',
				'reference',
				'reference'
			]);
			for (const situation of SITUATIONS)
				expect(lookup.plan(date, ALL_SAINTS, situation).admitted[0].texts).toEqual([
					'proprium/dominica-iv-post-epiphaniam-collecta',
					'proprium/dominica-iv-post-epiphaniam-secreta',
					'proprium/dominica-iv-post-epiphaniam-postcommunio'
				]);
			expect(commemorationName(IMPEDED, RESUMED, 'pl')).toBe(
				'Przeniesiona IV Niedziela po Objawieniu Pańskim'
			);
			expect(commemorationName(IMPEDED, RESUMED, 'en')).toBe(
				'Transferred Fourth Sunday after Epiphany'
			);
		}
	);
	it('names a resolved commemoration by its formulary and any other by its own title', () => {
		expect(commemorationName(IMPEDED, XXIII, 'pl')).toBe(
			'23. Niedziela po Zesłaniu Ducha Świętego'
		);
		expect(commemorationName(IMPEDED, XIII, 'en')).toBe('13th Sunday after Pentecost');
		expect(commemorationName(ST_PETRONILLA, null, 'en')).toBe('Saint Petronilla, Virgin');
		// A formulary this edition does not carry is never invented a name.
		expect(commemorationName(IMPEDED, 'dominica-ignota', 'pl')).toBe('Niedziela przeszkodzona');
	});
	it('reads one unconditional oration per role and fails closed on anything else', () => {
		expect(formularyOrations(components(XXIII))).toEqual([
			`proprium/${XXIII}-collecta`,
			`proprium/${XXIII}-secreta`,
			`proprium/${XXIII}-postcommunio`
		]);
		expect(formularyOrations(undefined)).toBeNull();
		const lacking = components(XXIII).filter(({ role }) => role !== 'secreta');
		expect(formularyOrations(lacking)).toBeNull();
		const doubled = [...components(XXIII), components(XXIII).find((c) => c.role === 'collecta')!];
		expect(() => formularyOrations(doubled)).toThrow(/single unconditional/);
		const conditional = components(XXIII).map((component) =>
			component.role === 'postcommunio'
				? { ...component, condition: { weekday: 'sunday' as const } }
				: component
		);
		expect(() => formularyOrations(conditional)).toThrow(/single unconditional/);
	});
	it('owes a Sunday whose orations the edition lacks instead of making none', () => {
		// The contract publishes such a pair as unavailable in all three situations with the
		// formulary still named; this edition carries every one, so the case is constructed.
		for (const sunday of [RESUMED, 'dominica-ignota']) {
			const owed = structuredClone(table);
			const row = rows(owed)[pairOf(owed, IMPEDED, '2043-11-01')];
			row.splice(4, 4, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE, sunday);
			const missing = createCommemorationLookup(owed);
			expect(missing.resolve('2043-11-01', ALL_SAINTS)[0].formulary).toBe(sunday);
			for (const situation of SITUATIONS) {
				const plan = missing.plan('2043-11-01', ALL_SAINTS, situation);
				expect(plan.admitted).toEqual([]);
				expect(plan.unavailable).toEqual([]);
				expect(
					plan.missing.map(({ commemoration, formulary }) => [commemoration.id, formulary])
				).toEqual([[IMPEDED, sunday]]);
			}
		}
	});
});

describe('the impeded feast, resolved per pair', () => {
	const lookup = createCommemorationLookup(table);
	it('commemorates the feast in the Sunday’s low and sung conventual Masses only', () => {
		const dates = lookup.datesOf(FESTUM);
		expect(dates).toHaveLength(206);
		expect(dates.map(({ date }) => date)).toEqual(dates.map(({ date }) => date).sort());
		// Twenty feasts, grouped in the edition's own formulary order.
		expect(
			PROPER_DAYS.map(({ id }) => id).filter((id) =>
				dates.some(({ formulary }) => formulary === id)
			)
		).toEqual(IMPEDED_FEASTS);
		expect(new Set(dates.map(({ mass }) => mass)).size).toBe(28);
		// The Sunday within the Christmas octave keeps St Stephen, St John or the Holy Innocents.
		expect(dates.filter(({ mass }) => mass === OCTAVE)).toHaveLength(35);
		for (const { date, mass, formulary, decisions } of dates) {
			expect(new Date(`${date}T12:00:00`).getDay(), date).toBe(0);
			// The Mass said is the Sunday the calendar keeps that day.
			expect(dayOn(date)?.formulary, date).toBe(mass);
			expect(Object.values(decisions), date).toEqual(['admitted', 'admitted', 'not-admitted']);
			for (const situation of ['lecta', 'cantu-conventualis'] as const) {
				const plan = lookup.plan(date, mass, situation);
				expect(
					plan.admitted.map(({ commemoration }) => commemoration.id),
					date
				).toEqual([FESTUM]);
				expect(plan.admitted[0].formulary, date).toBe(formulary);
				// The three orations the feast's own formulary assembles, by role.
				expect(plan.admitted[0].texts, date).toEqual(formularyOrations(components(formulary!)));
				expect([plan.unavailable, plan.missing], date).toEqual([[], []]);
			}
			expect(lookup.plan(date, mass, 'cantu-non-conventualis'), date).toEqual({
				admitted: [],
				unavailable: [],
				missing: []
			});
		}
	});
	it.each([
		['2026-12-27', OCTAVE, ST_JOHN],
		['2027-07-25', X, ST_JAMES],
		['2025-12-28', OCTAVE, 'sanctorum-innocentium-martyrum'],
		['2027-12-26', OCTAVE, 'sancti-stephani-protomartyris']
	])('%s / %s commemorates %s', (date, mass, feast) => {
		const [made] = lookup.plan(date, mass, 'lecta').admitted;
		expect(made.commemoration.id).toBe(FESTUM);
		expect(made.formulary).toBe(feast);
		expect(made.texts).toEqual([
			`proprium/${feast}-collecta`,
			`proprium/${feast}-secreta`,
			`proprium/${feast}-postcommunio`
		]);
	});
	it('says the Visitation’s Postcommunion for the Nativity of Our Lady, as her Mass does', () => {
		// Her formulary assembles its Postcommunion by reference; no text of its own exists.
		const reference = components(NATIVITY_BVM).find(({ role }) => role === 'postcommunio')!;
		expect([reference.text, reference.relation]).toEqual([VISITATION_POSTCOMMUNION, 'reference']);
		const dates = lookup.datesOf(FESTUM).filter(({ formulary }) => formulary === NATIVITY_BVM);
		expect(dates.map(({ date }) => date)).toHaveLength(10);
		for (const { date, mass } of dates)
			for (const situation of ['lecta', 'cantu-conventualis'] as const)
				expect(lookup.plan(date, mass, situation).admitted[0].texts, date).toEqual([
					`proprium/${NATIVITY_BVM}-collecta`,
					`proprium/${NATIVITY_BVM}-secreta`,
					VISITATION_POSTCOMMUNION
				]);
	});
	it('says the Chair of St Peter’s own composite orations', () => {
		// Each joins St Paul's oration under one conclusion, inside the Chair's own text.
		const dates = lookup.datesOf(FESTUM).filter(({ formulary }) => formulary === CHAIR);
		expect(dates.map(({ date, mass }) => [date, mass])).toEqual([
			['2060-02-22', 'dominica-in-sexagesima'],
			['2071-02-22', 'dominica-in-sexagesima'],
			['2082-02-22', 'dominica-in-sexagesima'],
			['2088-02-22', 'dominica-in-quinquagesima'],
			['2093-02-22', 'dominica-in-quinquagesima'],
			['2099-02-22', 'dominica-in-quinquagesima']
		]);
		for (const { date, mass } of dates)
			expect(lookup.plan(date, mass, 'lecta').admitted[0].texts, date).toEqual([
				`proprium/${CHAIR}-collecta`,
				`proprium/${CHAIR}-secreta`,
				`proprium/${CHAIR}-postcommunio`
			]);
	});
	it('names the impeded feast by its formulary', () => {
		expect(commemorationName(FESTUM, ST_JAMES, 'pl')).toBe('Świętego Jakuba Apostoła');
		expect(commemorationName(FESTUM, ST_JAMES, 'en')).toBe('Saint James the Apostle');
		expect(commemorationName(FESTUM, ST_JOHN, 'en')).toBe('Saint John, Apostle and Evangelist');
		expect(commemorationName(FESTUM, CHAIR, 'pl')).toBe('Katedry Świętego Piotra Apostoła');
		expect(commemorationName(FESTUM, CHAIR, 'en')).toBe('Chair of Saint Peter the Apostle');
		// A formulary this edition does not carry is never invented a name.
		expect(commemorationName(FESTUM, 'festum-ignotum', 'pl')).toBe('Święto przeszkodzone');
	});
});

describe('the Advent feria, resolved per pair', () => {
	const lookup = createCommemorationLookup(table);
	const dates = lookup.datesOf(FERIA);
	const said = dates.filter(({ decisions }) => decisions.lecta === 'admitted');
	const owed = dates.filter(({ decisions }) => decisions.lecta !== 'admitted');
	const weekday = (date: string) => new Date(`${date}T12:00:00`).getDay();
	const entryOf = (id: string) => lookup.commemorations.find((found) => found.id === id);
	it('commemorates the weekday at three feasts, on weekdays whose Mass is the feast', () => {
		expect(dates).toHaveLength(163);
		expect(dates.map(({ date }) => date)).toEqual(dates.map(({ date }) => date).sort());
		expect(new Set(dates.map(({ date }) => date)).size).toBe(163);
		expect(
			PROPER_DAYS.map(({ id }) => id).filter((id) => dates.some(({ mass }) => mass === id))
		).toEqual([ANDREW, IMMACULATE, THOMAS]);
		for (const { date, mass } of dates) {
			expect(weekday(date), date).not.toBe(0);
			expect(dayOn(date)?.formulary, date).toBe(mass);
			expect(dayOn(date)?.season, date).toBe('adventus');
		}
		const tally: Record<string, number> = {};
		for (const { mass, formulary } of dates)
			tally[`${mass} ${formulary}`] = (tally[`${mass} ${formulary}`] ?? 0) + 1;
		expect(tally).toEqual({
			[`${IMMACULATE} ${ADVENT_SUNDAYS[0]}`]: 21,
			[`${IMMACULATE} ${ADVENT_SUNDAYS[1]}`]: 45,
			[`${ANDREW} ${ADVENT_SUNDAYS[0]}`]: 33,
			[`${THOMAS} ${ADVENT_SUNDAYS[2]}`]: 10,
			[`${THOMAS} ${ADVENT_SUNDAYS[3]}`]: 33,
			[`${THOMAS} ${EMBER_FRIDAY}`]: 11,
			[`${THOMAS} ${EMBER_SATURDAY}`]: 10
		});
	});
	it('says the Sunday’s three orations by role in every Mass of 142 dates', () => {
		expect(said).toHaveLength(142);
		for (const { date, mass, formulary, decisions } of said) {
			expect(ADVENT_SUNDAYS, date).toContain(formulary);
			expect(new Set(Object.values(decisions)), date).toEqual(new Set(['admitted']));
			const orations = formularyOrations(components(formulary!));
			for (const situation of SITUATIONS) {
				const { admitted, unavailable, missing } = lookup.plan(date, mass, situation);
				expect(
					admitted.map((made) => [made.commemoration.id, made.formulary, made.texts]),
					`${date} ${situation}`
				).toEqual([[FERIA, formulary, orations]]);
				expect(unavailable.length + missing.length, `${date} ${situation}`).toBe(0);
			}
		}
	});
	it('owes the Ember day of Advent at St Thomas on 21 dates, naming a Mass not authored', () => {
		expect(owed).toHaveLength(21);
		const authored = new Set(FORMULARY_METADATA.map(({ id }) => id));
		expect([EMBER_FRIDAY, EMBER_SATURDAY].filter((id) => authored.has(id))).toEqual([]);
		for (const { date, mass, formulary, decisions } of owed) {
			expect([mass, date.slice(5)], date).toEqual([THOMAS, '12-21']);
			// The Friday and the Saturday of the week of the Third Sunday of Advent.
			expect(weekday(date), date).toBe(formulary === EMBER_FRIDAY ? 5 : 6);
			expect([EMBER_FRIDAY, EMBER_SATURDAY], date).toContain(formulary);
			expect(Object.values(decisions), date).toEqual(
				Array.from({ length: 3 }, () => 'omitted-required-de-tempore-unavailable')
			);
			for (const situation of SITUATIONS)
				expect(lookup.plan(date, mass, situation), `${date} ${situation}`).toEqual({
					admitted: [],
					unavailable: [],
					missing: [{ commemoration: entryOf(FERIA), formulary }]
				});
		}
	});
	it.each([
		['2026-11-30', ANDREW, ADVENT_SUNDAYS[0]],
		['2028-12-08', IMMACULATE, ADVENT_SUNDAYS[0]],
		['2026-12-08', IMMACULATE, ADVENT_SUNDAYS[1]],
		['2028-12-21', THOMAS, ADVENT_SUNDAYS[2]],
		['2026-12-21', THOMAS, ADVENT_SUNDAYS[3]],
		['2029-12-21', THOMAS, EMBER_FRIDAY],
		['2030-12-21', THOMAS, EMBER_SATURDAY]
	])('%s / %s commemorates the weekday from %s', (date, mass, formulary) => {
		const [decision] = lookup.resolve(date, mass);
		expect([decision.commemoration.id, decision.formulary]).toEqual([FERIA, formulary]);
	});
	it('names the weekday with the formulary of its prayers, and an Ember day by its own title', () => {
		expect(commemorationName(FERIA, ADVENT_SUNDAYS[1], 'pl')).toBe(
			'Dzień powszedni Adwentu (modlitwy: II Niedziela Adwentu)'
		);
		expect(commemorationName(FERIA, ADVENT_SUNDAYS[1], 'en')).toBe(
			'Weekday of Advent (prayers: Second Sunday of Advent)'
		);
		// The Polish one-letter numeral stays bound to its noun, as in every Polish title.
		expect(commemorationName(FERIA, ADVENT_SUNDAYS[0], 'pl')).toBe(
			'Dzień powszedni Adwentu (modlitwy: I\u00a0Niedziela Adwentu)'
		);
		expect(commemorationName(FERIA, ADVENT_SUNDAYS[3], 'en')).toBe(
			'Weekday of Advent (prayers: Fourth Sunday of Advent)'
		);
		// The Ember day's Mass is not in this edition: never invented a name, so the day notice says
		// the commemoration's own title.
		for (const ember of [EMBER_FRIDAY, EMBER_SATURDAY]) {
			expect(commemorationName(FERIA, ember, 'pl')).toBe('Dzień powszedni Adwentu');
			expect(commemorationName(FERIA, ember, 'en')).toBe('Weekday of Advent');
		}
		expect(
			M.pl.dayCommemorationMissing.replace('{title}', commemorationName(FERIA, EMBER_FRIDAY, 'pl'))
		).toBe(
			'tego dnia przypada wspomnienie: Dzień powszedni Adwentu. Jego modlitw nie ma jeszcze w\u00a0tym wydaniu'
		);
		expect(
			M.en.dayCommemorationMissing.replace(
				'{title}',
				commemorationName(FERIA, EMBER_SATURDAY, 'en')
			)
		).toBe(
			'a commemoration is due on this day: Weekday of Advent. Its prayers are not yet in this edition'
		);
	});
	it('chooses each resolved commemoration’s heading by identity and fails closed on another', () => {
		expect(Object.keys(RESOLVED_HEADINGS)).toEqual(
			lookup.commemorations.filter(({ resolved }) => resolved).map(({ id }) => id)
		);
		expect(RESOLVED_HEADINGS).toEqual({
			[IMPEDED]: 'formulary',
			[FERIA]: 'prayers',
			[FESTUM]: 'formulary'
		});
		// Rank does not choose it: the impeded Sunday and the Advent feria are both privileged.
		expect(entryOf(IMPEDED)?.rank).toBe(entryOf(FERIA)?.rank);
		expect(commemorationName(IMPEDED, ADVENT_SUNDAYS[1], 'en')).toBe('Second Sunday of Advent');
		expect(() => commemorationName('feria-ignota', ADVENT_SUNDAYS[1], 'pl')).toThrow(
			/without its heading/
		);
	});
});

describe('malformed selection resources', () => {
	const mutations: [string, (value: Table) => void, RegExp?][] = [
		['the previous selection version', (v) => void (v.schema_version = '2.0.0')],
		['profile', (v) => void (v.profiles[0].id = 'single-conclusion')],
		['situation order', (v) => void v.situations.reverse()],
		['decision vocabulary', (v) => void (v.decisions[2].id = 'omitted')],
		['slot order', (v) => void entry(v, LITANIES).slots.reverse()],
		[
			'unknown body',
			(v) => void (slotOf(v, LITANIES, 0).text = 'proprium/litaniae-maiores-oratio')
		],
		[
			'an addressed set with one slot left to a formulary',
			(v) => void (slotOf(v, LITANIES, 1).text = null),
			/invalid commemoration slot/
		],
		[
			'a resolved set with one addressed slot',
			(v) => void (slotOf(v, IMPEDED, 0).text = COLLECT),
			/invalid commemoration slot/
		],
		[
			'pair off occurrence',
			(v) => void rows(v).push(['2101-12-31', 0, at(v, LITANIES), 0, 0, 0, 0, null])
		],
		['duplicate pair', (v) => void rows(v).push([...rows(v)[rows(v).length - 1]])],
		['unknown Mass', (v) => void (v.masses[0] = 'missa-ignota')],
		['missing Mass', (v) => void v.masses.pop()],
		['noncanonical date', (v) => void (v.occurrences[0][0] = '2026-4-25')],
		['unordered occurrences', (v) => void v.occurrences.reverse()],
		['empty title', (v) => void (entry(v, LITANIES).title = '')],
		['extra field', (v) => void ((v as unknown as Record<string, unknown>).fallback = true)],
		[
			'a 2.0.0 pair row without its formulary',
			(v) => void (rows(v)[pairOf(v, LITANIES)] = rows(v)[pairOf(v, LITANIES)].slice(0, 7))
		],
		['a 1.0.0 pair row without decisions', (v) => void (rows(v)[0] = rows(v)[0].slice(0, 4))],
		['a boolean index', (v) => void (rows(v)[0][2] = false)],
		['a decision outside the vocabulary', (v) => void (rows(v)[0][6] = 3)],
		[
			'an addressed commemoration naming a formulary',
			(v) => void (rows(v)[pairOf(v, LITANIES)][7] = XXIII),
			/resolution outside the contract/
		],
		[
			'a resolved pair naming no formulary',
			(v) => void (rows(v)[pairOf(v, IMPEDED)][7] = null),
			/resolution outside the contract/
		],
		[
			'a resolved pair naming a title instead of an identity',
			(v) => void (rows(v)[pairOf(v, IMPEDED)][7] = 'Dominica XXIII post Pentecosten'),
			/resolution outside the contract/
		],
		[
			'an admitted resolution naming an unauthored Mass',
			(v) => void (rows(v)[pairOf(v, IMPEDED)][7] = 'dominica-ignota'),
			/names no authored Mass/
		],
		[
			'a privileged commemoration not made in a sung Mass that is not conventual',
			(v) => void (rows(v)[pairOf(v, LITANIES)][6] = 1),
			/outside the contract/
		],
		[
			'a resolved privileged commemoration owed in one situation only',
			(v) => void (rows(v)[pairOf(v, IMPEDED)][6] = UNAVAILABLE),
			/outside the contract/
		],
		[
			'an addressed privileged commemoration owed everywhere',
			(v) => void rows(v)[pairOf(v, LITANIES)].splice(4, 3, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE),
			/outside the contract/
		],
		[
			'an ordinary commemoration admitted in a sung Mass that is not conventual',
			(v) => void (rows(v)[pairOf(v, ST_PETRONILLA)][6] = ADMITTED),
			/outside the contract/
		],
		[
			'an ordinary commemoration decided apart in a low and a sung conventual Mass',
			(v) => void (rows(v)[pairOf(v, ST_PETRONILLA)][5] = 1),
			/outside the contract/
		],
		[
			'a second admitted commemoration in one situation',
			(v) =>
				beside(v, LITANIES, '2026-04-25', ST_PETRONILLA, [
					'2026-04-25',
					v.masses.indexOf(MARK),
					at(v, ST_PETRONILLA),
					0,
					0,
					0,
					1,
					null
				]),
			/more commemorations than the contract models/
		],
		[
			'an admitted commemoration beside an unavailable de Tempore one',
			(v) =>
				beside(v, LITANIES, '2026-04-25', ST_PETRONILLA, [
					'2026-04-25',
					v.masses.indexOf(MARK),
					at(v, ST_PETRONILLA),
					0,
					2,
					2,
					1,
					null
				]),
			/more commemorations than the contract models/
		],
		[
			'a resolved ordinary commemoration admitted in a sung Mass that is not conventual',
			(v) => void (rows(v)[pairOf(v, FESTUM)][6] = ADMITTED),
			/outside the contract/
		],
		[
			'a resolved ordinary commemoration admitted nowhere',
			(v) => void rows(v)[pairOf(v, FESTUM)].splice(4, 3, NOT_ADMITTED, NOT_ADMITTED, NOT_ADMITTED),
			/outside the contract/
		],
		[
			'a resolved ordinary commemoration owed in a low and a sung conventual Mass',
			(v) => void rows(v)[pairOf(v, FESTUM)].splice(4, 3, UNAVAILABLE, UNAVAILABLE, NOT_ADMITTED),
			/outside the contract/
		],
		[
			'a resolved ordinary commemoration owed everywhere',
			(v) => void rows(v)[pairOf(v, FESTUM)].splice(4, 3, UNAVAILABLE, UNAVAILABLE, UNAVAILABLE),
			/outside the contract/
		],
		[
			'a resolved ordinary commemoration decided apart in a low and a sung conventual Mass',
			(v) => void (rows(v)[pairOf(v, FESTUM)][5] = NOT_ADMITTED),
			/outside the contract/
		],
		[
			'a resolved ordinary pair naming no formulary',
			(v) => void (rows(v)[pairOf(v, FESTUM)][7] = null),
			/resolution outside the contract/
		],
		[
			'an admitted ordinary resolution naming an unauthored Mass',
			(v) => void (rows(v)[pairOf(v, FESTUM)][7] = 'festum-ignotum'),
			/names no authored Mass/
		],
		[
			'the impeded feast with one addressed slot',
			(v) => void (slotOf(v, FESTUM, 2).text = POSTCOMMUNION),
			/invalid commemoration slot/
		],
		[
			'a second admitted commemoration beside the impeded feast',
			(v) =>
				beside(v, FESTUM, '2026-12-27', ST_PETRONILLA, [
					'2026-12-27',
					v.masses.indexOf(OCTAVE),
					at(v, ST_PETRONILLA),
					0,
					0,
					0,
					1,
					null
				]),
			/more commemorations than the contract models/
		],
		// The Advent feria: a Sunday-resolved row is admitted everywhere and names an authored Mass,
		// and an Ember-day row names a Mass this edition does not author only while owed everywhere.
		[
			'an admitted Advent feria resolution naming an Ember day this edition does not author',
			(v) =>
				void rows(v)[pairOf(v, FERIA, '2029-12-21')].splice(4, 3, ADMITTED, ADMITTED, ADMITTED),
			/names no authored Mass/
		],
		[
			'an Ember-day resolution admitted in a sung Mass that is not conventual',
			(v) => void (rows(v)[pairOf(v, FERIA, '2029-12-21')][6] = ADMITTED),
			/outside the contract/
		],
		[
			'an Ember-day resolution not admitted in a sung Mass that is not conventual',
			(v) => void (rows(v)[pairOf(v, FERIA, '2030-12-21')][6] = NOT_ADMITTED),
			/outside the contract/
		],
		[
			'a Sunday-resolved Advent feria owed in one situation only',
			(v) => void (rows(v)[pairOf(v, FERIA, '2026-12-08')][4] = UNAVAILABLE),
			/outside the contract/
		],
		[
			'an admitted Advent feria resolved to a Sunday this edition does not author',
			(v) => void (rows(v)[pairOf(v, FERIA, '2026-12-08')][7] = 'dominica-v-adventus'),
			/names no authored Mass/
		],
		[
			'an Advent feria pair naming no formulary',
			(v) => void (rows(v)[pairOf(v, FERIA, '2029-12-21')][7] = null),
			/resolution outside the contract/
		],
		[
			'an Ember-day resolution naming a title instead of an identity',
			(v) =>
				void (rows(v)[pairOf(v, FERIA, '2029-12-21')][7] = 'Feria VI Quatuor Temporum Adventus'),
			/resolution outside the contract/
		],
		[
			'a second admitted commemoration beside the Advent feria',
			(v) =>
				beside(v, FERIA, '2026-12-08', ST_PETRONILLA, [
					'2026-12-08',
					v.masses.indexOf(IMMACULATE),
					at(v, ST_PETRONILLA),
					0,
					0,
					0,
					1,
					null
				]),
			/more commemorations than the contract models/
		],
		[
			'an admitted commemoration beside the owed Ember day',
			(v) =>
				beside(v, FERIA, '2029-12-21', ST_PETRONILLA, [
					'2029-12-21',
					v.masses.indexOf(THOMAS),
					at(v, ST_PETRONILLA),
					0,
					0,
					0,
					1,
					null
				]),
			/more commemorations than the contract models/
		]
	];
	it.each(mutations)('rejects a malformed resource: %s', (_name, mutate, message) => {
		const broken = structuredClone(table);
		mutate(broken);
		expect(() => createCommemorationLookup(broken)).toThrow(message ?? /./);
	});
	// The Fourth Sunday of Advent is resolved by the Advent feria alone (St Thomas).
	it.each([XXIII, ST_JAMES, ADVENT_SUNDAYS[3]])(
		'rejects an admitted resolution whose formulary %s cannot supply its three orations',
		(lacked) => {
			const lacking = new Map(
				FORMULARY_METADATA.map(({ id, components: parts }) => [
					id,
					id === lacked ? parts.filter(({ role }) => role !== 'secreta') : parts
				])
			);
			expect(() =>
				createCommemorationLookup(structuredClone(table), undefined, undefined, lacking)
			).toThrow(/without its orations/);
		}
	);
	it('accepts the untouched resource the mutations start from', () =>
		expect(() => createCommemorationLookup(structuredClone(table))).not.toThrow());
});

describe('typed row order', () => {
	// Eleven synthetic commemorations, so that indexes 2 and 10 meet on one date.
	const synthetic = (order: number[], pairs: Row[] = []) => ({
		...structuredClone(table),
		commemorations: Array.from({ length: 11 }, (_, index) => ({
			...structuredClone(entry(table, ST_PETRONILLA)),
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
		const second = ['2026-04-25', mark, 2, 0, 1, 1, 1, null];
		const tenth = ['2026-04-25', mark, 10, 0, 1, 1, 1, null];
		expect(
			createCommemorationLookup(synthetic([2, 10], [second, tenth])).resolve('2026-04-25', MARK)
		).toHaveLength(2);
		expect(() => createCommemorationLookup(synthetic([2, 10], [tenth, second]))).toThrow(
			/unordered commemoration pair/
		);
	});
});

describe('commemoration transport pack and resolved orations', () => {
	it.each(['pl', 'en'] as const)('%s pack carries exactly the six bodies', async (lang) => {
		const pack = validateCommemorationPack(await commemorationData(lang), lang);
		expect(pack.parts.map(({ key, slot }) => ({ key, slot }))).toEqual(COMMEMORATION_DECLARATIONS);
		const lookup = createCommemorationLookup(table);
		const litanies = selectedCommemorations(
			lookup.plan('2026-04-25', MARK, 'lecta').admitted,
			pack
		);
		expect(litanies.map(({ key, slot, commemoration }) => [key, slot, commemoration])).toEqual([
			[COLLECT, 'collecta', LITANIES],
			[SECRET, 'secreta', LITANIES],
			[POSTCOMMUNION, 'postcommunio', LITANIES]
		]);
		const petronilla = selectedCommemorations(
			lookup.plan('2027-05-31', QUEENSHIP, 'cantu-conventualis').admitted,
			pack
		);
		expect(petronilla.map(({ key, slot, commemoration }) => [key, slot, commemoration])).toEqual([
			[PETRONILLA[0], 'collecta', ST_PETRONILLA],
			[PETRONILLA[1], 'secreta', ST_PETRONILLA],
			[PETRONILLA[2], 'postcommunio', ST_PETRONILLA]
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
	it.each(['pl', 'en'] as const)(
		'%s takes the impeded Sunday’s orations from its own formulary, not from the pack',
		async (lang) => {
			const lookup = createCommemorationLookup(table);
			const pack = validateCommemorationPack(await commemorationData(lang), lang);
			const sunday = await properData(RESUMED, lang);
			const admitted = lookup.plan('2043-11-01', ALL_SAINTS, 'cantu-non-conventualis').admitted;
			// The pack carries none of them.
			expect(() => selectedCommemorations(admitted, pack)).toThrow(/body absent/);
			const said = selectedCommemorations(admitted, pack, {
				[RESUMED]: orationBodies(sunday!.parts)
			});
			expect(
				said.map(({ key, slot, commemoration, formulary }) => [key, slot, commemoration, formulary])
			).toEqual(
				['collecta', 'secreta', 'postcommunio'].map((slot) => [
					`proprium/dominica-iv-post-epiphaniam-${slot}`,
					slot,
					IMPEDED,
					RESUMED
				])
			);
			// Another formulary's bodies are not this pair's.
			expect(() =>
				selectedCommemorations(admitted, pack, { [XXIII]: orationBodies(sunday!.parts) })
			).toThrow(/body absent/);
		}
	);
	it.each(['pl', 'en'] as const)(
		'%s takes the impeded feast’s orations from its own formulary, the Chair’s composite whole',
		async (lang) => {
			const lookup = createCommemorationLookup(table);
			const pack = validateCommemorationPack(await commemorationData(lang), lang);
			const chair = await properData(CHAIR, lang);
			const admitted = lookup.plan('2060-02-22', 'dominica-in-sexagesima', 'lecta').admitted;
			expect(() => selectedCommemorations(admitted, pack)).toThrow(/body absent/);
			const said = selectedCommemorations(admitted, pack, { [CHAIR]: orationBodies(chair!.parts) });
			expect(said).toHaveLength(3);
			for (const [index, slot] of (['collecta', 'secreta', 'postcommunio'] as const).entries()) {
				const { key, commemoration, formulary } = said[index];
				expect([key, said[index].slot, commemoration, formulary], slot).toEqual([
					`proprium/${CHAIR}-${slot}`,
					slot,
					FESTUM,
					CHAIR
				]);
			}
			// The in-text rubric that joins St Paul's oration stays inside the body, between the
			// two orations, exactly where the Chair's own Mass has it.
			for (const body of said) {
				const kinds = (body.doc as TextDocument).segments.map(({ type }) => type);
				expect(
					kinds.filter((type) => type === 'rubric'),
					body.key
				).toHaveLength(1);
				expect(kinds.indexOf('rubric'), body.key).toBeGreaterThan(0);
				expect(kinds.indexOf('rubric'), body.key).toBeLessThan(kinds.lastIndexOf('verse'));
			}
			expect((said[0].doc as TextDocument).segments.map(({ id, type }) => [id, type])).toEqual([
				['s01', 'verse'],
				['s03', 'rubric'],
				['s04', 'verse'],
				['s02', 'verse']
			]);
			// The Nativity of Our Lady says the Visitation's Postcommunion, the body her own
			// formulary's payload carries for that role.
			const nativity = await properData(NATIVITY_BVM, lang);
			const [, , postcommunion] = selectedCommemorations(
				lookup.plan('2030-09-08', 'dominica-xiii-post-pentecosten', 'cantu-conventualis').admitted,
				pack,
				{ [NATIVITY_BVM]: orationBodies(nativity!.parts) }
			);
			expect([postcommunion.key, postcommunion.slot, postcommunion.formulary]).toEqual([
				VISITATION_POSTCOMMUNION,
				'postcommunio',
				NATIVITY_BVM
			]);
		}
	);
	it('rejects a pack with a body in the wrong slot', async () => {
		const pack = structuredClone(await commemorationData('en')) as { parts: { slot: string }[] };
		pack.parts[0].slot = 'secreta';
		expect(() => validateCommemorationPack(pack, 'en')).toThrow();
	});
});

describe('commemoration pages', () => {
	it.each(['pl', 'en'] as const)(
		'%s impeded Sunday page lists its Masses and dates and no orations of its own',
		async (lang) => {
			const page = await commemorationPageData(IMPEDED, lang);
			expect(page?.kind).toBe('resolved');
			if (page?.kind !== 'resolved') return;
			expect(page.title).toEqual({
				la: 'Dominica impedita',
				pl: 'Niedziela przeszkodzona',
				en: 'Impeded Sunday'
			});
			// Each date stands under its feast, here the Mass said that day.
			expect(page.feasts.map(({ id }) => id)).toEqual(
				PROPER_DAYS.map(({ id }) => id).filter((id) => page.feasts.some((m) => m.id === id))
			);
			expect(page.feasts).toHaveLength(7);
			const all = page.feasts.flatMap(({ dates }) => dates);
			expect(all).toHaveLength(75);
			expect(all.every(({ said }) => said)).toBe(true);
			const saints = page.feasts.find(({ id }) => id === ALL_SAINTS)!;
			expect(saints.dates.find(({ date }) => date === '2026-11-01')?.formulary).toBe(XXIII);
			const resumed = saints.dates.filter(({ formulary }) => formulary === RESUMED);
			expect(resumed.map(({ date }) => date)).toEqual(['2043-11-01', '2054-11-01', '2065-11-01']);
			expect(resumed[0].title?.[lang]).toBe(
				lang === 'pl'
					? 'Przeniesiona IV Niedziela po Objawieniu Pańskim'
					: 'Transferred Fourth Sunday after Epiphany'
			);
			expect(page).not.toHaveProperty('parts');
		}
	);
	it.each(['pl', 'en'] as const)(
		'%s impeded feast page lists each feast with its dates and the Sunday said on each',
		async (lang) => {
			const page = await commemorationPageData(FESTUM, lang);
			expect(page?.kind).toBe('resolved');
			if (page?.kind !== 'resolved') return;
			expect(page.title).toEqual({
				la: 'Festum impeditum',
				pl: 'Święto przeszkodzone',
				en: 'Impeded Feast'
			});
			// Here the feast is the formulary commemorated, not the Mass said.
			expect(page.feasts.map(({ id }) => id)).toEqual(IMPEDED_FEASTS_CIVIL);
			const all = page.feasts.flatMap(({ dates }) => dates);
			expect(all).toHaveLength(206);
			expect(all.every(({ said }) => said)).toBe(true);
			expect(new Set(all.map(({ date }) => date)).size).toBe(206);
			const john = page.feasts.find(({ id }) => id === ST_JOHN)!;
			expect(john.dates.find(({ date }) => date === '2026-12-27')?.formulary).toBe(OCTAVE);
			expect(john.dates.every(({ formulary }) => formulary === OCTAVE)).toBe(true);
			const james = page.feasts.find(({ id }) => id === ST_JAMES)!;
			expect(james.dates).toHaveLength(12);
			const summer = james.dates.find(({ date }) => date === '2027-07-25')!;
			expect([summer.formulary, summer.title?.en]).toEqual([X, '10th Sunday after Pentecost']);
			expect(page.feasts.find(({ id }) => id === CHAIR)?.dates).toHaveLength(6);
			expect(page).not.toHaveProperty('parts');
		}
	);
	it('knows which formulary of each resolved commemoration’s pair is the feast', () => {
		const lookup = createCommemorationLookup(table);
		expect(lookup.commemorations.filter(({ resolved }) => resolved).map(({ id }) => id)).toEqual(
			Object.keys(RESOLVED_FEAST_SIDE)
		);
		expect(RESOLVED_FEAST_SIDE).toEqual({
			[IMPEDED]: 'mass',
			[FERIA]: 'mass',
			[FESTUM]: 'formulary'
		});
		// The order of the feasts on each page is declared by identity as well: the side does not
		// decide it, since the impeded Sunday and the Advent feria share a side and not an order.
		expect(Object.keys(RESOLVED_FEAST_ORDER)).toEqual(Object.keys(RESOLVED_FEAST_SIDE));
		expect(RESOLVED_FEAST_ORDER).toEqual({
			[IMPEDED]: 'edition',
			[FERIA]: 'civil',
			[FESTUM]: 'civil'
		});
	});
	it.each(['pl', 'en'] as const)(
		'%s Advent feria page lists the three feasts in civil order and names each Ember day',
		async (lang) => {
			const page = await commemorationPageData(FERIA, lang);
			expect(page?.kind).toBe('resolved');
			if (page?.kind !== 'resolved') return;
			expect(page.title).toEqual({
				la: 'Feria Adventus',
				pl: 'Dzień powszedni Adwentu',
				en: 'Weekday of Advent'
			});
			// The feast is the pair's Mass, as for the impeded Sunday, and the feasts read by the
			// calendar: St Andrew, the Immaculate Conception, St Thomas.
			expect(page.feasts.map(({ id }) => id)).toEqual([ANDREW, IMMACULATE, THOMAS]);
			expect(page.feasts.map(({ dates }) => dates.length)).toEqual([33, 66, 64]);
			const rows = page.feasts.flatMap(({ dates }) => dates);
			expect(rows.filter(({ said }) => said)).toHaveLength(142);
			// A Sunday said is a formulary of this edition, to be linked.
			const tuesday = page.feasts[1].dates.find(({ date }) => date === '2026-12-08')!;
			expect([tuesday.formulary, tuesday.authored, tuesday.said, tuesday.title?.en]).toEqual([
				ADVENT_SUNDAYS[1],
				true,
				true,
				'Second Sunday of Advent'
			]);
			// An Ember day is named, not linked: its Mass is not in this edition, and nothing is said.
			const ember = rows.filter(({ said }) => !said);
			expect(ember).toHaveLength(21);
			expect(ember.every(({ authored }) => !authored)).toBe(true);
			const names = {
				[EMBER_FRIDAY]: { pl: 'Piątek Suchych Dni Adwentu', en: 'Ember Friday of Advent' },
				[EMBER_SATURDAY]: { pl: 'Sobota Suchych Dni Adwentu', en: 'Ember Saturday of Advent' }
			};
			for (const { date, formulary, title } of ember)
				expect(title?.[lang], date).toBe(names[formulary as keyof typeof names][lang]);
			const friday = page.feasts[2].dates.find(({ date }) => date === '2029-12-21')!;
			expect([friday.formulary, friday.authored, friday.said]).toEqual([
				EMBER_FRIDAY,
				false,
				false
			]);
			expect(page).not.toHaveProperty('parts');
		}
	);
	it('does not build the Advent feria page when an Ember day has no name', async () => {
		// The page names only what this edition says: remove one name and it fails closed.
		const absent = M.en.commemorationAbsentMasses;
		const kept = absent[EMBER_SATURDAY];
		delete absent[EMBER_SATURDAY];
		try {
			await expect(commemorationPageData(FERIA, 'en')).rejects.toThrow(/names an unknown Mass/);
		} finally {
			absent[EMBER_SATURDAY] = kept;
		}
		expect((await commemorationPageData(FERIA, 'en'))?.kind).toBe('resolved');
	});
	it('keeps the addressed commemorations’ pages as their three orations', async () => {
		for (const id of [LITANIES, ST_PETRONILLA]) {
			const page = await commemorationPageData(id, 'en');
			expect(page?.kind, id).toBe('orations');
			if (page?.kind !== 'orations') continue;
			expect(page.parts.map(({ part }) => part)).toEqual(['collecta', 'secreta', 'postcommunio']);
		}
		expect(await commemorationPageData('dominica-ignota', 'en')).toBeNull();
	});
});

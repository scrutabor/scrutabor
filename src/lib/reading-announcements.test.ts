import {
	readingRoles as roles,
	parseReadingFixture as parse,
	readingLookup as lookup,
	readingSuiteFixture
} from './reading-test-fixtures';
import { describe, expect, it } from 'vitest';
import table from './data/introductiones.json';
import { announcedReadings } from './reading-announcements';

const healthy = () =>
	structuredClone(table) as unknown as {
		schema_version: string;
		units: { id: string; role: string }[];
		events: { id: string; before: string; occurrences: Record<string, unknown>[] }[];
		passion: {
			units: string[];
			omitted_events: string[];
			omitted_units: string[];
			lecta: Record<string, unknown>;
			cantu: Record<string, unknown>;
		};
		announcements: {
			reading: string;
			unit: string;
			pericope: { book: string; passages: { chapter: number; verses: number[][] }[] };
		}[];
	};
type Mutable = ReturnType<typeof healthy>;
const faults: [string, (t: Mutable) => void][] = [
	[
		'legacy version',
		(t) => {
			t.schema_version = '1.0.0';
		}
	],
	[
		'greeting by legal low-Mass server',
		(t) => {
			(t.events[0].occurrences[0].lecta as Record<string, unknown>).speaker = 'minister';
		}
	],
	[
		'greeting by legal sung choir',
		(t) => {
			(t.events[0].occurrences[0].cantu as Record<string, unknown>).speaker = 'schola';
		}
	],
	[
		'response by legal priest',
		(t) => {
			(t.events[0].occurrences[1].lecta as Record<string, unknown>).speaker = 'sacerdos';
		}
	],
	[
		'known wrong placement',
		(t) => {
			t.events[0].before = 'secreta';
		}
	],
	[
		'known role in wrong occurrence',
		(t) => {
			t.events[0].occurrences.reverse();
		}
	],
	[
		'gospel events reversed',
		(t) => {
			[t.events[2], t.events[3]] = [t.events[3], t.events[2]];
		}
	],
	[
		'epistle announcement sung',
		(t) => {
			(t.events[1].occurrences[0].cantu as Record<string, unknown>).voice = 'cantus';
		}
	],
	[
		'gospel announcement spoken',
		(t) => {
			(t.events[3].occurrences[0].cantu as Record<string, unknown>).voice = 'clara';
		}
	],
	[
		'slot replaced by legal unit',
		(t) => {
			delete t.events[1].occurrences[0].slot;
			t.events[1].occurrences[0].unit = 'salutatio';
		}
	],
	[
		'Passion assigned a legal Gospel unit',
		(t) => {
			t.passion.units = ['sequentia-sancti-evangelii-secundum-matthaeum'];
		}
	],
	[
		'Passion by legal sung choir',
		(t) => {
			t.passion.cantu.speaker = 'schola';
		}
	],
	[
		'Passion keeps greeting',
		(t) => {
			t.passion.omitted_events = [];
		}
	],
	[
		'Passion keeps answer',
		(t) => {
			t.passion.omitted_units = [];
		}
	],
	[
		'missing known reading',
		(t) => {
			t.announcements.pop();
		}
	],
	[
		'wrong legal book',
		(t) => {
			t.announcements[0].pericope.book = 'Rom';
		}
	],
	[
		'chapter zero',
		(t) => {
			t.announcements[0].pericope.passages[0].chapter = 0;
		}
	],
	[
		'empty verses',
		(t) => {
			t.announcements[0].pericope.passages[0].verses = [];
		}
	],
	[
		'reversed range',
		(t) => {
			t.announcements[0].pericope.passages[0].verses = [[15, 10]];
		}
	]
];

it('accepts the exact new resource with every formulary reading bound', () => {
	expect(lookup.units.size).toBe(31);
	expect(lookup.events).toHaveLength(6);
	expect(lookup.announcements.size).toBe(205);
	expect(roles.size).toBe(205);
});
it.each(faults)('rejects the actual semantic corruption: %s', (_name, mutate) => {
	const broken = healthy();
	mutate(broken);
	expect(() => parse(broken)).toThrow(/introductiones:/);
	expect(() => parse(healthy())).not.toThrow();
});

describe.each(['pl', 'en'] as const)('%s reading sequences', (lang) => {
	const suite = readingSuiteFixture(lang);
	const reading = suite.reading;

	it.each([...lookup.announcements.values()])('assembles $reading', async (binding) => {
		const body = await reading(binding.reading);
		const original = structuredClone(body);
		const role = roles.get(body.key)!;
		const result = announcedReadings(role, [body], suite.owners, lookup);
		const passion = lookup.passion.units.includes(binding.unit);
		const christmasDay = binding.reading === 'proprium/nativitas-domini-in-die-evangelium';
		expect(result).toHaveLength(role === 'epistola' || passion ? 2 : christmasDay ? 3 : 4);
		if (christmasDay) {
			// One event cuts adjacent heading and response segments from the same canonical owner.
			expect(binding.unit).toBe('initium-sancti-evangelii-secundum-ioannem');
			expect(
				result.slice(0, -1).map((run) => [run.key, run.doc.segments.map((s) => s.id)])
			).toEqual([
				['ordinarium/praefatio-dialogus', ['s02', 's03']],
				['ordinarium/evangelium-ultimum', ['s05', 's06']]
			]);
			expect(result[1].doc.segments.flatMap((s) => s.words ?? []).map((w) => w.id)).toEqual([
				'w007',
				'w008',
				'w009',
				'w010',
				'w011',
				'w012',
				'w013',
				'w014'
			]);
			const savedOwners = structuredClone(suite.owners);
			const malformedOwners = structuredClone(suite.owners);
			malformedOwners['ordinarium/evangelium-ultimum'].doc.segments.find(
				(s) => s.id === 's06'
			)!.id = 'foreign';
			expect(() => announcedReadings(role, [body], malformedOwners, lookup)).toThrow(
				/does not address one complete owner segment/
			);
			expect(() => announcedReadings(role, [body], suite.owners, lookup)).not.toThrow();
			expect(suite.owners).toEqual(savedOwners);
		}
		const { readingPericope, ...asRead } = result.at(-1)!;
		expect(asRead).toEqual({
			...original,
			readingReference: binding.reference,
			referenceMisprint: binding.misprint,
			referenceUncertain: binding.reference_uncertain
		});
		expect(!!readingPericope).toBe(!!(binding.misprint || binding.reference_uncertain));
		expect(
			result
				.slice(0, -1)
				.every(
					(r) =>
						!r.readingReference &&
						!r.referenceMisprint &&
						!r.referenceUncertain &&
						!r.readingPericope
				)
		).toBe(true);
		expect(result.some((r) => r.slug.includes('evangelium-salutatio'))).toBe(
			role === 'evangelium' && !passion
		);
		expect(
			result
				.slice(0, -1)
				.some((r) =>
					r.doc.segments.some((s) => s.id === 's06' && r.key === 'ordinarium/evangelium-ultimum')
				)
		).toBe(role === 'evangelium' && !passion);
		expect(body).toEqual(original);
		const identities = result.flatMap((r) =>
			r.doc.segments.flatMap((s) => (s.words ?? []).map((w) => `${r.slug}.${w.id}`))
		);
		expect(new Set(identities).size).toBe(identities.length);
	});
	it('keeps repeated readings and their announcements independently addressable', async () => {
		const key = [...lookup.announcements.keys()].find((k) => roles.get(k) === 'epistola')!;
		const bodies = [await reading(key), await reading(key, '~second')];
		const result = announcedReadings('epistola', bodies, suite.owners, lookup);
		expect(new Set(result.map((r) => r.slug)).size).toBe(4);
		expect(result[0].doc.segments[0].words).toEqual(result[2].doc.segments[0].words);
	});
	it('rejects changed body delivery and a missing owner', async () => {
		const key = [...lookup.announcements.keys()].find(
			(k) => roles.get(k) === 'evangelium' && !k.includes('passionis')
		)!;
		const body = await reading(key);
		const broken = structuredClone(body);
		const verse = broken.doc.segments.find((s) => s.type === 'verse')!;
		verse.delivery = undefined;
		expect(() => announcedReadings('evangelium', [broken], suite.owners, lookup)).toThrow(
			/delivery differ/
		);
		expect(() => announcedReadings('evangelium', [body], {}, lookup)).toThrow(/no owner text/);
		expect(() => announcedReadings('evangelium', [body], suite.owners, lookup)).not.toThrow();
	});
});

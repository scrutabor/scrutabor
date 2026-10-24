import {
	parseReadingFixture as parse,
	readingLookup as lookup,
	readingOwnerFixture,
	actualReadingFixture
} from './reading-test-fixtures';
import { beforeAll, describe, expect, it } from 'vitest';
import table from './data/introductiones.json';
import { announcedReadings, type AnnouncementOwner } from './reading-announcements';

const LOW = 'proprium/dominica-in-albis-evangelium';
const LENT = 'proprium/dominica-iii-in-quadragesima-evangelium';

it('retains the exact literal and normalized locators without promoting uncertainty', () => {
	expect(lookup.announcements.get(LOW)).toMatchObject({
		reference: 'Ioann. 80, 19-31',
		reference_uncertain: true
	});
	expect(lookup.announcements.get(LOW)!.misprint).toBeUndefined();
	expect(lookup.announcements.get(LENT)).toMatchObject({
		reference: 'Luc. 11, 4-28',
		misprint: true
	});
	expect(lookup.announcements.get(LENT)!.reference_uncertain).toBeUndefined();
	expect(
		[...lookup.announcements.values()]
			.filter((row) => row.reference_uncertain)
			.map((row) => row.reading)
	).toEqual([LOW]);
});

it.each([false, null, 1, 'true'])('rejects an uncertainty flag that is not true: %s', (invalid) => {
	const broken = structuredClone(table) as unknown as { announcements: Record<string, unknown>[] };
	broken.announcements.find((row) => row.reading === LOW)!.reference_uncertain = invalid;
	expect(() => parse(broken)).toThrow(/invalid announcement binding/);
	expect(() => parse(table)).not.toThrow();
});

it('keeps the contract closed and rejects contradictory reference claims', () => {
	for (const delta of [{ misprint: true }, { uncertainty_details: 'damaged glyph' }]) {
		const broken = structuredClone(table) as unknown as {
			announcements: Record<string, unknown>[];
		};
		Object.assign(
			broken.announcements.find((row) => row.reading === LOW)!,
			delta
		);
		expect(() => parse(broken)).toThrow(/invalid announcement binding/);
	}
	expect(() => parse(table)).not.toThrow();
});

describe.each(['pl', 'en'] as const)('%s reference assembly', (lang) => {
	let owners: Record<string, AnnouncementOwner>;
	beforeAll(async () => {
		owners = await readingOwnerFixture(lang);
	});
	it.each([
		[LOW, 'Ioann 20, 19–31', true],
		[LENT, 'Luc 11, 14–28', false]
	] as const)(
		'carries both distinct locators on the reading only: %s',
		async (key, normalized, uncertain) => {
			const original = await actualReadingFixture(key, lang);
			const saved = structuredClone(original);
			const result = announcedReadings('evangelium', [original], owners, lookup);
			const body = result.at(-1)!;
			expect(body.readingReference).toBe(lookup.announcements.get(key)!.reference);
			expect(body.readingPericope).toBe(normalized);
			expect(!!body.referenceUncertain).toBe(uncertain);
			expect(!!body.referenceMisprint).toBe(!uncertain);
			expect(
				result
					.slice(0, -1)
					.every(
						(row) =>
							!row.readingReference &&
							!row.referenceMisprint &&
							!row.referenceUncertain &&
							!row.readingPericope
					)
			).toBe(true);
			expect(original).toEqual(saved);
		}
	);
});

import { describe, expect, it } from 'vitest';
import { TEXTS } from './corpus';
import {
	PROPER_DAYS,
	PROPER_PARTS,
	SLOT_OF,
	artifactPath,
	dayById,
	partOf,
	properRank
} from './proprium';
import { ORDO } from './ordo';

const properKeys = Object.keys(TEXTS).filter((k) => k.startsWith('proprium/'));

describe('the days table and the corpus agree', () => {
	it('names a day for every proprium text', () => {
		// A text whose day is not in the table can never be chosen, so it is
		// vendored for nobody — the same defect the shelf test catches for
		// every other category.
		const orphans = properKeys.filter(
			(key) => !PROPER_DAYS.some((d) => key.startsWith(`proprium/${d.id}-`))
		);
		expect(orphans, 'proprium texts belonging to no named day').toEqual([]);
	});

	it('has texts for every day it names', () => {
		// The other direction: a day in the picker with nothing behind it is a
		// dead option, and the artifact endpoint would 404 on it.
		const empty = PROPER_DAYS.filter(
			(d) => !properKeys.some((key) => key.startsWith(`proprium/${d.id}-`))
		).map((d) => d.id);
		expect(empty, 'days named with no texts').toEqual([]);
	});

	it('gives every day a name in Latin and both languages', () => {
		for (const d of PROPER_DAYS) {
			for (const k of ['la', 'pl', 'en'] as const) {
				expect(d.title[k], `${d.id} has no ${k} title`).toBeTruthy();
			}
		}
	});

	it('recognises the part of every proprium slug', () => {
		const unknown = properKeys.filter((key) => !partOf(key.split('/')[1]));
		expect(unknown, 'slugs naming no known part').toEqual([]);
	});
});

describe('parts reach the spine', () => {
	it('sends every part to a slot the Ordo actually has', () => {
		const slots = new Set(
			ORDO.flatMap((m) => m.entries)
				.filter((e) => e.kind === 'proper')
				.map((e) => e.id)
		);
		for (const part of PROPER_PARTS) {
			expect(
				slots.has(SLOT_OF[part]),
				`${part} maps to slot ${SLOT_OF[part]}, which the Ordo lacks`
			).toBe(true);
		}
	});

	it('folds the chant parts into one slot', () => {
		// Gradual, alleluia, tract and sequence share the Ordo's single chant
		// entry, because which is sung depends on the season.
		expect(SLOT_OF.graduale).toBe(SLOT_OF.alleluia);
		expect(SLOT_OF.tractus).toBe(SLOT_OF.graduale);
		expect(SLOT_OF.sequentia).toBe(SLOT_OF.graduale);
		// Everything else stands alone.
		expect(SLOT_OF.introitus).not.toBe(SLOT_OF.collecta);
	});

	it('ranks the parts in rite order, not alphabetical', () => {
		expect(properRank('x-introitus')).toBeLessThan(properRank('x-collecta'));
		expect(properRank('x-graduale')).toBeLessThan(properRank('x-evangelium'));
		expect(properRank('x-communio')).toBeLessThan(properRank('x-postcommunio'));
		// alphabetically alleluia would lead; in the rite it follows the gradual
		expect(properRank('x-alleluia')).toBeGreaterThan(properRank('x-graduale'));
		expect(properRank('x-nonsense')).toBe(-1);
	});
});

describe('lookups', () => {
	it('finds a day by id and refuses one it does not have', () => {
		expect(dayById(PROPER_DAYS[0].id)?.id).toBe(PROPER_DAYS[0].id);
		expect(dayById('dominica-nulla')).toBeUndefined();
	});

	it('builds the artifact path the endpoint actually serves', () => {
		expect(artifactPath('dominica-i-adventus', 'pl')).toBe(
			'/artifacts/proprium/pl/dominica-i-adventus.json'
		);
	});
});

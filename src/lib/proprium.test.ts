import { describe, expect, it } from 'vitest';
import { TEXT_KEYS } from './corpus';
import {
	PROPER_DAYS,
	PROPER_PARTS,
	SEASONS,
	SLOT_OF,
	artifactPath,
	dayById,
	partOf,
	properRank
} from './proprium';
import { ORDO } from './ordo';
import { properData } from './loaders';

const properKeys = TEXT_KEYS.filter((k) => k.startsWith('proprium/'));

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

	it('resolves every explicitly assigned shared part', () => {
		for (const day of PROPER_DAYS) {
			for (const [part, key] of Object.entries(day.parts ?? {})) {
				expect(PROPER_PARTS, `${day.id} assigns an unknown ${part}`).toContain(part);
				expect(TEXT_KEYS, `${day.id}/${part} resolves to no corpus text`).toContain(key);
			}
		}
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

	it('assembles a shared preface in its proper rite position', async () => {
		const trinity = await properData('sanctissimae-trinitatis', 'pl');
		expect(trinity?.parts.map(({ part }) => part)).toEqual([
			'introitus',
			'collecta',
			'epistola',
			'graduale',
			'alleluia',
			'evangelium',
			'offertorium',
			'secreta',
			'praefatio',
			'communio',
			'postcommunio'
		]);
		expect(trinity?.parts.find(({ part }) => part === 'praefatio')?.key).toBe(
			'ordinarium/praefatio-sanctissimae-trinitatis'
		);
	});

	it('keeps the mandatory Corpus Christi sequence and the common Preface fallback', async () => {
		const feast = await properData('corporis-christi', 'en');
		expect(feast?.parts.map(({ part }) => part)).toEqual([
			'introitus',
			'collecta',
			'epistola',
			'graduale',
			'alleluia',
			'sequentia',
			'evangelium',
			'offertorium',
			'secreta',
			'communio',
			'postcommunio'
		]);
		expect(feast?.parts.some(({ part }) => part === 'praefatio')).toBe(false);
	});

	it('assembles the Sacred Heart Preface in the Canon position', async () => {
		const feast = await properData('sacratissimi-cordis-iesu', 'pl');
		expect(feast?.parts.map(({ part }) => part)).toEqual([
			'introitus',
			'collecta',
			'epistola',
			'graduale',
			'alleluia',
			'evangelium',
			'offertorium',
			'secreta',
			'praefatio',
			'communio',
			'postcommunio'
		]);
		expect(feast?.parts.find(({ part }) => part === 'praefatio')?.key).toBe(
			'ordinarium/praefatio-sacratissimi-cordis-iesu'
		);
	});

	it('keeps the calendar identity of All Souls while exposing all three Masses', async () => {
		const first = await properData('commemoratio-omnium-fidelium-defunctorum', 'pl');
		const second = await properData('commemoratio-omnium-fidelium-defunctorum-missa-ii', 'en');
		const third = await properData('commemoratio-omnium-fidelium-defunctorum-missa-iii', 'en');
		expect(first?.parts[0].key).toBe(
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-introitus'
		);
		expect(second?.parts[0].key).toBe(
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-introitus'
		);
		expect(third?.parts[0].key).toBe(
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-introitus'
		);
		expect(second?.parts.find(({ part }) => part === 'collecta')?.key).toBe(
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-ii-collecta'
		);
		expect(third?.parts.find(({ part }) => part === 'collecta')?.key).toBe(
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-iii-collecta'
		);
		for (const mass of [first, second, third]) {
			expect(mass?.parts.find(({ part }) => part === 'praefatio')?.key).toBe(
				'ordinarium/praefatio-defunctorum'
			);
		}
	});

	it('reuses the existing Advent offertory in the tenth Sunday after Pentecost', async () => {
		const sunday = await properData('dominica-x-post-pentecosten', 'en');
		expect(sunday?.parts.find(({ part }) => part === 'offertorium')?.key).toBe(
			'proprium/dominica-i-adventus-offertorium'
		);
	});

	it('gives the transferred Epiphany Sundays the seasonal chants printed for them', async () => {
		for (const id of ['dominica-v-post-epiphaniam', 'dominica-vi-post-epiphaniam']) {
			const sunday = await properData(id, 'en');
			for (const part of ['introitus', 'graduale', 'alleluia', 'offertorium', 'communio']) {
				expect(sunday?.parts.find((item) => item.part === part)?.key).toBe(
					`proprium/dominica-xxiii-post-pentecosten-${part}`
				);
			}
		}
	});
});

describe('a day is offered only where it can act', () => {
	it('names the season of every day, and only seasons the picker groups by', () => {
		// The picker groups by season, so a day whose season is not in the
		// list would be offered under no group at all — present in the data
		// and absent from the control.
		for (const day of PROPER_DAYS) {
			expect(SEASONS, day.id).toContain(day.season);
		}
	});

	it('knows which movements carry a proper slot, and which carry none', () => {
		// The picker is hidden where nothing fills. That is a claim about the
		// spine, and the spine changes: if a proper slot is ever added to the
		// movement this fails and someone decides on purpose.
		const withProper = ORDO.filter((m) => m.entries.some((e) => e.kind === 'proper')).map(
			(m) => m.id
		);
		expect(withProper).toEqual(['catechumenorum', 'offertorium', 'canon', 'conclusio']);
	});

	it('leaves no movement showing a proper slot it cannot fill', () => {
		// Every slot a movement carries must be one the day artifacts answer,
		// or the reader picks a day and a labelled slot stays empty with no
		// account of why.
		const slots = new Set(Object.values(SLOT_OF));
		for (const m of ORDO) {
			for (const e of m.entries.filter((x) => x.kind === 'proper')) {
				expect(slots, `${m.id}/${e.id}`).toContain(e.id);
			}
		}
	});
});

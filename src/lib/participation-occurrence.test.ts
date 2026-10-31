import { expect, it } from 'vitest';
import { loadText } from './corpus';
import type { GlossDocument, TextDocument } from './corpus';
import { introductionBodies, introductionLookup } from './introductiones';
import { flowBinding } from './reading-flow';
import { inMassForm } from './speaker-marks';
import { isEveryonesResponse, isYours, mayJoin } from './role.svelte';

const LAST = 'ordinarium/evangelium-ultimum';
const LOW = { gradus: 1, source: 'DMS 31 a' };
const SUNG = { gradus: 1, source: 'DMS 25 a' };
const OCCURRENCES = [
	['ordinarium/deo-gratias-epistolae', ['s01']],
	[LAST, ['s03', 's06', 's15']]
] as const;

for (const lang of ['pl', 'en'] as const) {
	it.each(['lecta', 'cantu'] as const)(
		`${lang} preserves four fixed replies with the correct %s reader cues`,
		async (form) => {
			for (const [key, ids] of OCCURRENCES) {
				const body = await loadText(key, lang);
				if (!body) throw new Error(`missing actual reply ${key}`);
				const before = structuredClone(body);
				const active = flowBinding(body.text, body.gloss, { helpLevel: 0 }, form, 'populus');
				const reference = flowBinding(
					body.text,
					body.gloss,
					{ helpLevel: 0, referenceOnly: true },
					form,
					'populus'
				);
				for (const id of ids) {
					const index = body.text.segments.findIndex((segment) => segment.id === id);
					expect(index).toBeGreaterThanOrEqual(0);
					const segment = body.text.segments[index];
					const effective = inMassForm(segment, form);
					expect(segment.participation).toEqual({ lecta: LOW });
					expect(effective.speaker).toBe('minister');
					expect(effective.voice).toBe(segment.voice);
					expect(isYours(effective, 'populus', form)).toBe(form === 'lecta');
					expect(isYours(effective, 'minister', form)).toBe(true);
					expect(isEveryonesResponse(effective, form)).toBe(form === 'lecta');
					expect(mayJoin(effective, form)).toBe(false);
					expect(active.options.response(index)).toBe(form === 'lecta');
					expect(reference.options.response(index)).toBe(false);
					expect(reference.options.namesWho(index)).toBe(false);
					expect(reference.segs[index].words).toEqual(segment.words);
				}
				expect(body).toEqual(before);
			}
		}
	);

	async function ordinaryGospel() {
		if (!introductionLookup) throw new Error('missing actual introduction resource');
		const lookup = structuredClone(introductionLookup);
		const binding = lookup.announcements.get('proprium/ascensio-domini-evangelium');
		if (!binding) throw new Error('missing actual ordinary Gospel binding');
		const announcement = lookup.units.get(binding.unit);
		if (!announcement) throw new Error('missing actual Gospel announcement');
		const source = lookup.events.find((event) => event.id === 'evangelium-annuntiatio');
		if (!source) throw new Error('missing actual ordinary Gospel event');
		const event = {
			...structuredClone(source),
			occurrences: source.occurrences.map((occurrence) =>
				'slot' in occurrence
					? { unit: binding.unit, lecta: occurrence.lecta, cantu: occurrence.cantu }
					: structuredClone(occurrence)
			)
		};
		const owners: Record<string, { doc: TextDocument; gloss: GlossDocument }> = {};
		for (const key of new Set([LAST, announcement.text, 'ordinarium/praefatio-dialogus'])) {
			const owner = await loadText(key, lang);
			if (!owner) throw new Error(`missing actual Gospel owner ${key}`);
			owners[key] = { doc: owner.text, gloss: owner.gloss };
		}
		return { lookup, event, owners };
	}

	it(`${lang} gives the ordinary Gospel its own sourced reply without changing its owner`, async () => {
		const fixture = await ordinaryGospel();
		const before = structuredClone(fixture);
		const bodies = introductionBodies(fixture.event, fixture.owners, fixture.lookup);
		const cut = bodies.flatMap((body) => body.doc.segments).find((segment) => segment.id === 's06');
		if (!cut) throw new Error('missing actual cut Gospel reply');
		expect(cut.participation).toEqual({ lecta: LOW, cantu: SUNG });
		const effective = inMassForm(cut, 'cantu');
		expect([effective.speaker, effective.voice]).toEqual(['schola', 'cantus']);
		expect(isEveryonesResponse(effective, 'cantu')).toBe(true);
		expect(isYours(effective, 'populus', 'cantu')).toBe(true);
		expect(fixture).toEqual(before);
		expect(
			fixture.owners[LAST].doc.segments.find((segment) => segment.id === 's06')?.participation
		).toEqual({ lecta: LOW });
	});

	it(`${lang} rejects altered ordinary Gospel contexts and restores the real occurrence`, async () => {
		const pristine = await ordinaryGospel();
		for (const fault of ['event', 'unit', 'owner', 'range', 'source', 'old-grant'] as const) {
			const damaged = structuredClone(pristine);
			const unit = damaged.lookup.units.get('responsio-gloria-tibi')!;
			const occurrence = damaged.event.occurrences[1];
			switch (fault) {
				case 'event':
					damaged.event.id = 'offertorium-introductio';
					break;
				case 'unit':
					occurrence.unit = 'responsio-salutationis';
					break;
				case 'owner':
					unit.text = 'ordinarium/praefatio-dialogus';
					unit.segment = 's03';
					unit.words = ['w003', 'w004', 'w005', 'w006'];
					break;
				case 'range':
					unit.words = ['w013', 'w014'];
					break;
				case 'source':
					occurrence.cantu.source = 'DMS 31 a';
					break;
				case 'old-grant':
					damaged.owners[LAST].doc.segments.find(
						(segment) => segment.id === 's06'
					)!.participation!.cantu = SUNG;
					break;
			}
			expect(() => introductionBodies(damaged.event, damaged.owners, damaged.lookup)).toThrow(
				/introduction .*ordinary Gospel|introduction .*owner|introduction .*segment/
			);
			expect(() =>
				introductionBodies(pristine.event, pristine.owners, pristine.lookup)
			).not.toThrow();
		}
	});
}

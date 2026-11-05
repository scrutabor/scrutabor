import { expect, it } from 'vitest';
import { loadText } from './corpus';
import { properData } from './loaders';
import { dayById } from './proprium';
import { ordinaryOmission } from './ordinary-omission';
import { ordinarySegmentView, omittedOrdinaryCitation } from './ordinary-segment-omissions';
import { validateOrdinarySegmentOmissions } from './ordinary-omission-descriptors';
import {
	expectWholeBodyOmitted,
	loadOrdinaryReference,
	settledSelection,
	unresolvedPayloadCases
} from './ordinary-test-fixtures';
import { readingPayloadReady } from './reading-announcements';
import { unconfirmedOrdoContext } from './ordo-applicability';
import { selectedOrdinaryBodyContext } from './requiem-view';
import { inMassForm } from './speaker-marks';
import { voicesInMassForm } from './participation-performance';
import { findOrphans } from './polish';

const cases = [
	['2026-04-02', 'feria-v-in-cena-domini', ['qui-dixisti']],
	['2026-04-04', 'vigilia-paschalis', ['agnus-dei', 'qui-dixisti']]
] as const;

it.each(['pl', 'en'] as const)(
	'loads the actual %s Thursday recension and keeps all three canonical bodies distinct',
	async (lang) => {
		const payload = (await properData(cases[0][1], lang))!;
		const chosen = payload.parts.filter((row) => row.slot === 'agnus-dei');
		expect(chosen).toHaveLength(1);
		const agnus = chosen[0];
		expect(agnus.key).toBe('ordinarium/agnus-dei-in-cena-domini');
		expect(agnus.doc.id).toBe('ordinarium.agnus-dei-in-cena-domini');
		expect(agnus.gloss.text).toBe(agnus.doc.id);
		expect(agnus.doc.segments.map((s) => s.words?.length)).toEqual([8, 8, 8]);
		const words = agnus.doc.segments.flatMap((s) => s.words ?? []);
		expect(words.map((w) => w.id)).toEqual(
			Array.from({ length: 24 }, (_, i) => `w${String(i + 1).padStart(3, '0')}`)
		);
		expect(words.filter((w) => w.form === 'miserére')).toHaveLength(3);
		expect(words.some((w) => w.form === 'dona')).toBe(false);
		expect(selectedOrdinaryBodyContext(agnus)).toBe(agnus.gloss.about);
		expect(agnus.gloss.about?.trim()).toBeTruthy();
		for (const row of agnus.doc.segments) {
			expect(inMassForm(row, 'cantu').speaker).toBe('sacerdos');
			expect(voicesInMassForm(row, 'cantu')).toEqual(['secreto', 'cantus']);
		}
		const ordinary = (await loadText('ordinarium/agnus-dei', lang))!;
		const requiem = (await loadText('ordinarium/agnus-dei-defunctorum', lang))!;
		expect(ordinary.text.segments.flatMap((s) => s.words ?? [])).toHaveLength(25);
		expect(requiem.text.segments.flatMap((s) => s.words ?? [])).toHaveLength(28);
		expect(
			(await properData(cases[1][1], lang))!.parts.filter((row) => row.slot === 'agnus-dei')
		).toEqual([]);
	}
);

it.each(cases)(
	'derives %s/%s omissions only from the settled received prescription and preserves citations',
	async (date, mass, omitted) => {
		for (const lang of ['pl', 'en'] as const) {
			const day = dayById(mass)!;
			const state = settledSelection(date, mass, lang);
			expect(validateOrdinarySegmentOmissions(day.ordinary_omissions)).toBe(day.ordinary_omissions);
			for (const slot of omitted) {
				const original = await loadOrdinaryReference(slot, lang);
				const saved = structuredClone(original);
				const note = ordinaryOmission(slot, state, lang)!;
				expect(note.text).toBe(original.key);
				if (slot === 'qui-dixisti') expect(note.note).toContain('Pax Domini');
				if (lang === 'pl') expect(findOrphans(note.note)).toEqual([]);
				const view = ordinarySegmentView(slot, original, day.ordinary_omissions, true);
				expectWholeBodyOmitted(original, view);
				expect(omittedOrdinaryCitation(original, view, null, `${slot}.s02`, '')?.query).toBe(
					'?s=s02'
				);
				expect(original).toEqual(saved);
				for (const [stateName, patch] of [
					...unresolvedPayloadCases,
					['foreign date', { date: '2026-04-05' }],
					['wrong language', { loadedLanguage: lang === 'pl' ? 'en' : 'pl' }]
				] as const) {
					const pending = { ...state, ...patch };
					if (stateName === 'stale Mass')
						pending.loadedMass =
							mass === 'vigilia-paschalis' ? 'feria-v-in-cena-domini' : 'vigilia-paschalis';
					expect(ordinaryOmission(slot, pending, lang)).toBeUndefined();
					expect(unconfirmedOrdoContext(slot, pending, lang)?.referenceOnly).toBe(true);
					expect(
						ordinarySegmentView(
							slot,
							original,
							day.ordinary_omissions,
							readingPayloadReady(pending, lang)
						).body
					).toBe(original);
					expect(ordinaryOmission(slot, state, lang)?.text).toBe(original.key);
				}
				expect(() =>
					ordinarySegmentView(
						slot,
						{ ...original, slug: 'foreign-owner' },
						day.ordinary_omissions,
						true
					)
				).toThrow('ordinary omission has no complete canonical body');
			}
			for (const retained of [
				'pax-domini',
				'haec-commixtio',
				'fili-dei-vivi',
				'perceptio-corporis'
			]) {
				expect(ordinaryOmission(retained, state, lang)).toBeUndefined();
				const loaded = (await loadText(`ordinarium/${retained}`, lang))!;
				expect(loaded.text.segments.some((s) => s.words?.length)).toBe(true);
			}
			const pax = (await loadText('ordinarium/pax-domini', lang))!;
			expect(
				pax.text.segments
					.filter((s) => s.type === 'verse')
					.every((s) => inMassForm(s, 'lecta').voice === 'clara')
			).toBe(true);
			const ordinary = settledSelection(date, null, lang);
			for (const slot of ['agnus-dei', 'qui-dixisti'])
				expect(ordinaryOmission(slot, ordinary, lang)).toBeUndefined();
		}
	}
);

it.each(cases)('rejects altered ordered wire alternatives for %s/%s', (_date, mass) => {
	const received = dayById(mass)!.ordinary_omissions;
	for (const mutate of [
		(rows: unknown[]) => rows.reverse(),
		(rows: unknown[]) => rows.splice(0, 1),
		(rows: unknown[]) => rows.push(structuredClone(rows[0])),
		(rows: unknown[]) => Object.assign(rows[1] as object, { reason: 'requiem-peace-prayer' }),
		(rows: unknown[]) => Object.assign(rows[1] as object, { text: 'ordinarium/pax-domini' }),
		(rows: unknown[]) => Object.assign(rows[1] as object, { segments: ['s02'] })
	]) {
		const rows: unknown[] = structuredClone(received);
		mutate(rows);
		expect(() => validateOrdinarySegmentOmissions(rows)).toThrow();
		expect(validateOrdinarySegmentOmissions(received)).toBe(received);
	}
});

it.each(cases)(
	'does not infer omissions from the date or Mass name without its received %s/%s descriptors',
	async (date, mass, omitted) => {
		const day = dayById(mass)!;
		const received = day.ordinary_omissions;
		try {
			day.ordinary_omissions = [];
			for (const lang of ['pl', 'en'] as const)
				for (const slot of omitted) {
					const loaded = (await loadText(`ordinarium/${slot}`, lang))!;
					const original = {
						key: `ordinarium/${slot}`,
						slug: slot,
						anchor: slot,
						doc: loaded.text,
						gloss: loaded.gloss
					};
					expect(ordinaryOmission(slot, settledSelection(date, mass, lang), lang)).toBeUndefined();
					expect(ordinarySegmentView(slot, original, day.ordinary_omissions, true).body).toBe(
						original
					);
				}
		} finally {
			day.ordinary_omissions = received;
		}
		expect(day.ordinary_omissions).toBe(received);
	}
);

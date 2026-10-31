import { expect, it } from 'vitest';
import { dismissalData, properData } from './loaders';
import { loadText, type Segment } from './corpus';
import table from './data/dismissal.json';
import { createDismissalLookup, selectedDismissal, validateDismissalPack } from './dismissal';
import { dayById } from './proprium';
import { settledSelection, unresolvedPayloadCases } from './ordinary-test-fixtures';
import { ordinaryOmission } from './ordinary-omission';
import { ordinarySegmentView, omittedOrdinaryCitation } from './ordinary-segment-omissions';
import { inMassForm } from './speaker-marks';
import { voicesInMassForm } from './participation-performance';
import { requiemBodyContext, requiemLastGospelContext } from './requiem-view';

const masses = [
	'commemoratio-omnium-fidelium-defunctorum',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii'
];

it.each(['pl', 'en'] as const)(
	'loads complete %s recensions and preserves distinct ritual actions',
	async (lang) => {
		const lookup = createDismissalLookup(table);
		const pack = await dismissalData(lang);
		expect(validateDismissalPack(pack, lang)).toEqual(pack);
		for (const mass of masses) {
			const proper = (await properData(mass, lang))!;
			const agni = proper.parts.filter((part) => part.slot === 'agnus-dei');
			expect(agni).toHaveLength(1);
			const agnus = agni[0];
			expect(agnus.key).toBe('ordinarium/agnus-dei-defunctorum');
			expect(agnus.doc.segments).toHaveLength(3);
			expect(agnus.doc.segments.flatMap((s) => s.words ?? [])).toHaveLength(28);
			for (const row of agnus.doc.segments as Segment[]) {
				expect(inMassForm(row, 'cantu').speaker).toBe('sacerdos');
				expect(voicesInMassForm(row, 'cantu')).toEqual(['secreto', 'cantus']);
			}
			expect(requiemBodyContext(agnus)).toBe(agnus.gloss.about);
			const dismissal = selectedDismissal(lookup.resolve('2026-11-02', mass), pack)[0];
			expect(dismissal.doc.title).toBe('Requiéscant in pace');
			expect(dismissal.doc.segments.flatMap((s) => s.words ?? [])).toHaveLength(10);
			const rip = dismissal.doc.segments[2] as Segment;
			expect(inMassForm(rip, 'lecta').speaker).toBe('sacerdos');
			expect(inMassForm(rip, 'lecta').voice).toBe('clara');
			expect(inMassForm(rip, 'cantu').speaker).toBeUndefined();
			expect(inMassForm(rip, 'cantu').voice).toBe('cantus');
			expect(rip.participation).toBeUndefined();
			const bad = structuredClone(pack);
			bad.parts = bad.parts.filter((part) => part.key !== dismissal.key);
			expect(() => validateDismissalPack(bad, lang)).toThrow();
			expect(validateDismissalPack(pack, lang)).toEqual(pack);
		}
	}
);

it.each(['pl', 'en'] as const)(
	'omits exact %s bodies only after settled transport and preserves citation intent',
	async (lang) => {
		const mass = masses[0];
		const state = settledSelection('2026-11-02', mass, lang);
		for (const slot of ['iudica-me', 'qui-dixisti', 'benedictio']) {
			const key = `ordinarium/${slot}`;
			const loaded = (await loadText(key, lang))!;
			const original = { key, slug: slot, anchor: slot, doc: loaded.text, gloss: loaded.gloss };
			const saved = structuredClone(original);
			expect(ordinaryOmission(slot, state, lang)?.text).toBe(key);
			const view = ordinarySegmentView(slot, original, dayById(mass)!.ordinary_omissions, true);
			expect(view.body.doc.segments).toEqual([]);
			expect(view.omitted).toEqual(original.doc.segments.map((s) => s.id));
			expect(omittedOrdinaryCitation(original, view, `${slot}.w001`, null, '')?.query).toBe(
				'?w=w001'
			);
			expect(original).toEqual(saved);
			for (const [, patch] of unresolvedPayloadCases) {
				expect(ordinaryOmission(slot, { ...state, ...patch }, lang)).toBeUndefined();
				expect(ordinaryOmission(slot, state, lang)?.text).toBe(key);
			}
			const bad = structuredClone(dayById(mass)!.ordinary_omissions);
			bad[1].text = 'ordinarium/introibo' as (typeof bad)[1]['text'];
			expect(() => ordinarySegmentView(slot, original, bad, true)).toThrow();
			expect(
				ordinarySegmentView(slot, original, dayById(mass)!.ordinary_omissions, false).body
			).toBe(original);
		}
		for (const retained of [
			'introibo',
			'pax-domini',
			'haec-commixtio',
			'fili-dei-vivi',
			'perceptio-corporis',
			'placeat-tibi',
			'evangelium-ultimum'
		])
			expect(ordinaryOmission(retained, state, lang)).toBeUndefined();
		expect(requiemLastGospelContext('evangelium-ultimum', state, lang)).toBeTruthy();
		expect(
			requiemLastGospelContext('evangelium-ultimum', { ...state, loading: true }, lang)
		).toBeUndefined();
		const ordinary = settledSelection('2026-04-12', 'dominica-in-albis', lang);
		expect(requiemLastGospelContext('evangelium-ultimum', ordinary, lang)).toBeUndefined();
		for (const slot of ['iudica-me', 'qui-dixisti', 'benedictio'])
			expect(ordinaryOmission(slot, ordinary, lang)).toBeUndefined();
	}
);

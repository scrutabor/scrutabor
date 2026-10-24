import { settledSelection as settled, unresolvedPayloadCases } from './ordinary-test-fixtures';
import { expect, it } from 'vitest';
import type { GospelPreparationState } from './ordo-context';
import { ordinaryOmission } from './ordinary-omission';
import { ORDO } from './ordo';
import { dayById } from './proprium';
import { resolveOrdoChoice } from './ordo-choice';
import { findOrphans } from './polish';

const cases = [
	['2026-11-29', 'dominica-i-adventus', true, false],
	['2026-04-26', 'dominica-iii-post-pascha', false, false],
	['2026-03-29', 'dominica-ii-passionis', true, false],
	['2026-04-02', 'feria-v-in-cena-domini', false, true],
	['2026-04-04', 'vigilia-paschalis', false, true],
	['2026-05-23', 'vigilia-pentecostes', false, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', true, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-ii', true, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-iii', true, true],
	['2025-12-24', 'vigilia-nativitatis', true, true],
	['2028-12-24', 'vigilia-nativitatis', true, false],
	['2027-07-26', 'sanctae-annae-matris-beatae-mariae-virginis', false, true],
	['2026-11-09', 'dedicatio-archibasilicae-sanctissimi-salvatoris', false, false]
] as const;

it.each(cases)('omits only the explicit settled parts at %s/%s', (date, mass, gloria, credo) => {
	expect(resolveOrdoChoice(date, mass)).toEqual({ date, mass });
	for (const lang of ['pl', 'en'] as const) {
		for (const [part, omitted] of [
			['gloria', gloria],
			['credo', credo]
		] as const) {
			const result = ordinaryOmission(part, settled(date, mass, lang), lang);
			expect(result !== undefined).toBe(omitted);
			if (result) {
				expect(result.note).toContain(lang === 'pl' ? 'nie odmawia się' : 'is omitted');
				expect(result.note).not.toMatch(/wglądu|reference|;/);
				if (lang === 'pl') expect(findOrphans(result.note)).toEqual([]);
				else expect(result.note).not.toContain('\u00a0');
			}
		}
	}
});

const unsettled: [string, Partial<GospelPreparationState>][] = [
	['no date', { date: null }],
	['invalid date', { date: '2026-02-30' }],
	['foreign date', { date: '2026-04-26' }],
	...unresolvedPayloadCases,
	['unknown Mass', { mass: 'unknown', loadedMass: 'unknown' }]
];

it.each(unsettled)('does not hide known omitted Gloria while %s', (_, patch) => {
	for (const lang of ['pl', 'en'] as const) {
		const healthy = settled('2026-11-29', 'dominica-i-adventus', lang);
		expect(ordinaryOmission('gloria', healthy, lang)).toBeDefined();
		expect(ordinaryOmission('gloria', { ...healthy, ...patch }, lang)).toBeUndefined();
		expect(ordinaryOmission('gloria', healthy, lang)).toBeDefined();
	}
});

it('requires matching payload language before the omitted branch and recovers', () => {
	for (const lang of ['pl', 'en'] as const) {
		const healthy = settled('2026-04-04', 'vigilia-paschalis', lang);
		expect(ordinaryOmission('credo', healthy, lang)).toBeDefined();
		expect(
			ordinaryOmission('credo', { ...healthy, loadedLanguage: lang === 'pl' ? 'en' : 'pl' }, lang)
		).toBeUndefined();
		expect(ordinaryOmission('credo', healthy, lang)).toBeDefined();
	}
});

it('keeps the complete Ordinary on dates whose selected Mass would omit a part', () => {
	for (const lang of ['pl', 'en'] as const) {
		for (const date of ['2026-11-29', '2026-04-04', '2026-11-02']) {
			expect(resolveOrdoChoice(date, 'none')).toEqual({ date, mass: null });
			for (const part of ['gloria', 'credo'])
				expect(ordinaryOmission(part, settled(date, null, lang), lang)).toBeUndefined();
		}
	}
});

it('cannot turn a catalogue-only Mass into an occurrence', () => {
	for (const mass of [
		'dominica-i-post-epiphaniam',
		'dominica-iii-quae-superfuit-post-epiphaniam'
	]) {
		const state = settled('2026-11-29', mass, 'en');
		expect(resolveOrdoChoice(state.date!, mass)).toBeNull();
		for (const part of ['gloria', 'credo'])
			expect(ordinaryOmission(part, state, 'en')).toBeUndefined();
	}
});

it('uses actual canonical prescription inputs, without treating required or unresolved as omitted', () => {
	const day = dayById('dominica-i-adventus')!;
	const original = day.ordinary;
	const state = settled('2026-11-29', day.id, 'en');
	expect(ordinaryOmission('gloria', state, 'en')).toBeDefined();
	try {
		day.ordinary = structuredClone(original);
		day.ordinary.gloria.sunday = 'required';
		expect(ordinaryOmission('gloria', state, 'en')).toBeUndefined();
		day.ordinary.gloria.sunday = 'unresolved';
		expect(ordinaryOmission('gloria', state, 'en')).toBeUndefined();
	} finally {
		day.ordinary = original;
	}
	expect(day.ordinary).toBe(original);
	expect(ordinaryOmission('gloria', state, 'en')).toBeDefined();
});

it('does not create an application-side rule for any other Ordinary entry', () => {
	const state = settled('2026-04-04', 'vigilia-paschalis', 'en');
	for (const entry of ORDO.flatMap((movement) => movement.entries)) {
		if (entry.id !== 'gloria' && entry.id !== 'credo')
			expect(ordinaryOmission(entry.id, state, 'en'), entry.id).toBeUndefined();
	}
});

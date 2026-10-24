import { describe, expect, it } from 'vitest';
import { loadText, type Segment } from './corpus';
import {
	namesPerformance,
	performanceFor,
	validateParticipationPerformance,
	voicesInMassForm
} from './participation-performance';
import { offersMassFormChoice, offersRoleChoice } from './reading-settings';
import { isYours, ROLES, showsWords } from './role.svelte';
import { inMassForm } from './speaker-marks';

interface MutableGrant {
	gradus?: unknown;
	source?: unknown;
	performance?: unknown;
	conditional?: unknown;
}

interface MutableRow {
	id: string;
	type: string;
	speaker: string;
	voice: string;
	participation: Record<string, MutableGrant>;
	delivery?: unknown;
}

function body(): { segments: MutableRow[] } {
	return {
		segments: [0, 1].map((n) => ({
			id: `s${n}`,
			type: 'verse',
			speaker: 'sacerdos',
			voice: 'clara',
			delivery: { cantu: { voice: 'secreto' } },
			participation: {
				lecta: { gradus: 3, source: 'DMS 31 c' },
				cantu: {
					gradus: 2,
					source: 'DMS 25 b',
					performance: {
						speaker: 'schola',
						voice: 'cantus',
						source: 'DMS 25 b; 26'
					}
				}
			}
		}))
	};
}

describe('closed received performance metadata', () => {
	it('does not make an ordinary quiet Canon body audible without a performance', () => {
		const document = body();
		for (const row of document.segments) delete row.participation.cantu.performance;
		const segments = document.segments as unknown as Segment[];
		expect(
			showsWords(
				segments.flatMap((s) => voicesInMassForm(s, 'cantu')),
				undefined,
				'populus'
			)
		).toBe(false);
		expect(
			showsWords(
				segments.flatMap((s) => voicesInMassForm(s, 'cantu')),
				undefined,
				'sacerdos'
			)
		).toBe(true);
	});
	it('accepts the supplement without replacing priest ownership', () => {
		const document = body();
		expect(() => validateParticipationPerformance(document, '6.7.0')).not.toThrow();
		expect(() => validateParticipationPerformance(document, '6.5.0')).toThrow();
		const segments = document.segments as unknown as Segment[];
		expect(namesPerformance(segments, 0, 'cantu')).toBe(true);
		expect(namesPerformance(segments, 1, 'cantu')).toBe(false);
		expect(performanceFor(segments[0], 'lecta')).toBeUndefined();
		for (const role of ROLES)
			for (const form of ['lecta', 'cantu'] as const) {
				expect(segments.every((s) => isYours(inMassForm(s, form), role, form))).toBe(true);
				expect(
					showsWords(
						segments.flatMap((s) => voicesInMassForm(s, form)),
						undefined,
						role
					)
				).toBe(true);
			}
		expect(offersMassFormChoice(segments)).toBe(true);
		expect(offersRoleChoice(segments)).toBe(false);
	});
	it.each([
		['empty', {}],
		['null', null],
		['array', []],
		['actor', { speaker: 'sacerdos', voice: 'cantus', source: 'DMS 25 b; 26' }],
		['voice', { speaker: 'schola', voice: 'clara', source: 'DMS 25 b; 26' }],
		['source', { speaker: 'schola', voice: 'cantus', source: 'DMS 31 c' }],
		['extra', { speaker: 'schola', voice: 'cantus', source: 'DMS 25 b; 26', clock: true }]
	])('rejects %s descriptors', (_, value) => {
		const document = body();
		document.segments[0].participation.cantu.performance = value;
		expect(() => validateParticipationPerformance(document, '6.7.0')).toThrow();
	});
	it.each([
		'rubric',
		'base',
		'override',
		'conditional',
		'lecta',
		'unknown-form',
		'wrong-clara',
		'missing-delivery'
	])('rejects %s context', (mutation) => {
		const document = body();
		const segment = document.segments[0];
		if (mutation === 'rubric') segment.type = 'rubric';
		if (mutation === 'base') segment.speaker = 'schola';
		if (mutation === 'override')
			segment.delivery = { cantu: { speaker: 'schola', voice: 'cantus' } };
		if (mutation === 'wrong-clara') segment.delivery = { cantu: { voice: 'clara' } };
		if (mutation === 'missing-delivery') delete segment.delivery;
		if (mutation === 'conditional') segment.participation.cantu.conditional = true;
		if (mutation === 'lecta')
			segment.participation.lecta.performance = segment.participation.cantu.performance;
		if (mutation === 'unknown-form') segment.participation.other = segment.participation.cantu;
		expect(() => validateParticipationPerformance(document, '6.7.0')).toThrow();
	});
	it('does not pretend shape validation detects a wholly absent feature', () => {
		const document = body();
		for (const segment of document.segments) delete segment.participation.cantu.performance;
		expect(() => validateParticipationPerformance(document, '6.7.0')).not.toThrow();
		expect(offersMassFormChoice(document.segments as unknown as Segment[])).toBe(true);
		// Canonical derivation and reader artifact validation own this negative control.
	});
	it.each(['pl', 'en'] as const)(
		'checks the actual 6.7 %s body, not only synthetic fixtures',
		async (lang) => {
			const entry = await loadText('ordinarium/sanctus', lang);
			expect(entry).toBeDefined();
			const segments = entry!.text.segments;
			expect(() => validateParticipationPerformance(entry!.text, '6.7.0')).not.toThrow();
			expect(segments.filter((s) => performanceFor(s, 'cantu'))).toHaveLength(5);
			expect(segments.flatMap((s) => s.words ?? []).map((w) => w.id)).toEqual(
				Array.from({ length: 25 }, (_, n) => `w${String(n + 1).padStart(3, '0')}`)
			);
		}
	);
});

it.each(['6.6.0', '6.8.0'])(
	'rejects performance metadata at reader %s and retains the recovered 6.7 body',
	(version) => {
		const document = body();
		const original = structuredClone(document);
		expect(() => validateParticipationPerformance(document, '6.7.0')).not.toThrow();
		expect(() => validateParticipationPerformance(document, version)).toThrow(
			'invalid participation performance'
		);
		expect(document).toEqual(original);
		expect(() => validateParticipationPerformance(document, '6.7.0')).not.toThrow();
	}
);

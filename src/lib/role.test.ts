import { describe, expect, it } from 'vitest';
import type { Segment } from './corpus';
import { isEveryonesResponse, isYours, mayJoin, showsWords } from './role.svelte';
import { inMassForm, marked } from './speaker-marks';

const segment = (conditional = false): Segment =>
	({
		id: 's01',
		type: 'verse',
		speaker: 'sacerdos',
		participation: {
			cantu: {
				gradus: conditional ? 3 : 1,
				source: conditional ? 'DMS 25 c' : 'DMS 25 a',
				...(conditional ? { conditional: true as const } : {})
			}
		}
	}) as Segment;

describe('the faithful’s part', () => {
	it('owns an unconditional response', () => {
		const response = segment();
		expect(isYours(response, 'populus', 'cantu')).toBe(true);
		expect(isYours(response, 'minister', 'cantu')).toBe(true);
		expect(isYours(response, 'sacerdos', 'cantu')).toBe(true);
		expect(isEveryonesResponse(response, 'cantu')).toBe(true);
		expect(mayJoin(response, 'cantu')).toBe(false);
	});

	it('presents a conditional faculty as permission, not ownership', () => {
		const proper = segment(true);
		expect(isYours(proper, 'populus', 'cantu')).toBe(false);
		expect(isYours(proper, 'minister', 'cantu')).toBe(false);
		expect(isYours(proper, 'sacerdos', 'cantu')).toBe(true);
		expect(isEveryonesResponse(proper, 'cantu')).toBe(false);
		expect(mayJoin(proper, 'cantu')).toBe(true);
	});
});

describe('folding wholly silent prayers', () => {
	it('keeps an audible ending visible despite a silent spine fallback', () => {
		for (const audible of ['clara', 'cantus', 'submissa']) {
			expect(showsWords(['secreto', audible, audible], 'secreto', 'populus')).toBe(true);
		}
	});

	it('folds wholly silent prayers only for the faithful', () => {
		expect(showsWords(['secreto', 'secreto'], undefined, 'populus')).toBe(false);
		for (const role of ['minister', 'sacerdos'] as const) {
			expect(showsWords(['secreto', 'secreto'], 'secreto', role)).toBe(true);
		}
	});

	it('uses the spine only when no segment voice is known', () => {
		expect(showsWords([], 'secreto', 'populus')).toBe(false);
		expect(showsWords([undefined], 'secreto', 'populus')).toBe(false);
		expect(showsWords([], 'submissa', 'populus')).toBe(true);
		expect(showsWords([], undefined, 'populus')).toBe(true);
		expect(showsWords([undefined, 'clara'], 'secreto', 'populus')).toBe(true);
	});

	it('preserves the final-secret response in both forms of Mass', () => {
		const secret: Segment[] = [
			{ id: 's01', type: 'verse', speaker: 'sacerdos', voice: 'secreto' },
			{
				id: 's02',
				type: 'verse',
				speaker: 'sacerdos',
				voice: 'clara',
				delivery: { cantu: { speaker: 'sacerdos', voice: 'cantus' } }
			},
			{
				id: 's03',
				type: 'verse',
				speaker: 'minister',
				voice: 'clara',
				delivery: { cantu: { speaker: 'schola', voice: 'cantus' } },
				participation: {
					lecta: { gradus: 1, source: 'DMS 31 a' },
					cantu: { gradus: 1, source: 'DMS 25 a' }
				}
			}
		];
		for (const form of ['lecta', 'cantu'] as const) {
			const effective = secret.map((part) => inMassForm(part, form));
			expect(
				showsWords(
					effective.map((part) => part.voice),
					'secreto',
					'populus'
				)
			).toBe(true);
			expect(effective[0].voice).toBe('secreto');
			expect(effective[1].voice).toBe(form === 'cantu' ? 'cantus' : 'clara');
			expect(effective[2].speaker).toBe(form === 'cantu' ? 'schola' : 'minister');
			for (const role of ['populus', 'minister'] as const) {
				expect(isYours(effective[2], role, form)).toBe(true);
				expect(isYours(effective[1], role, form)).toBe(false);
			}
			expect(isYours(effective[2], 'sacerdos', form)).toBe(false);
			expect(isEveryonesResponse(effective[2], form)).toBe(true);
			expect(marked(effective, 2)).toBe(true);
		}
	});
});

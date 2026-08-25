import { describe, expect, it } from 'vitest';
import type { Segment } from './corpus';
import { isEveryonesResponse, isYours, mayJoin } from './role.svelte';

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
		expect(isEveryonesResponse(response, 'cantu')).toBe(true);
		expect(mayJoin(response, 'cantu')).toBe(false);
	});

	it('presents a conditional faculty as permission, not ownership', () => {
		const proper = segment(true);
		expect(isYours(proper, 'populus', 'cantu')).toBe(false);
		expect(isEveryonesResponse(proper, 'cantu')).toBe(false);
		expect(mayJoin(proper, 'cantu')).toBe(true);
	});
});

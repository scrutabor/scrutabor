import { describe, expect, it } from 'vitest';
import { documentBoxDelta, type DocumentBox } from '../tests/document-box';

const before = {
	x: Number('78.38333129882812'),
	y: 13018.466674804688,
	width: 208.01666259765625,
	height: 368.63336181640625
};
const zero = { x: 0, y: 0, width: 0, height: 0 };

describe('scroll-independent document-box comparisons', () => {
	it('accepts the measured Firefox coordinate arithmetic difference, not exact equality', () => {
		const after = { ...before, y: 13018.466659545898 };
		expect(after).not.toEqual(before);
		expect(documentBoxDelta(after, before)).toEqual(zero);
		expect(documentBoxDelta(before, after)).toEqual(zero);
	});

	it('retains exact unchanged geometry', () => {
		expect(documentBoxDelta(before, before)).toEqual(zero);
	});

	for (const key of ['x', 'y', 'width', 'height'] as const) {
		for (const shift of [-1, -1 / 60, -0.001, 0.001, 1 / 60, 1]) {
			it(`rejects a ${shift}px change to ${key}`, () => {
				expect(documentBoxDelta(before, before)).toEqual(zero);
				const changed = { ...before, [key]: before[key] + shift };
				const difference = documentBoxDelta(changed, before);
				expect(difference).not.toEqual(zero);
				expect(difference[key]).toBeCloseTo(shift, 9);
				for (const other of Object.keys(zero) as (keyof DocumentBox)[]) {
					if (other !== key) expect(difference[other]).toBe(0);
				}
			});
		}

		it(`does not accept a non-finite ${key}`, () => {
			for (const value of [NaN, Infinity, -Infinity]) {
				const invalid = { ...before, [key]: value };
				expect(documentBoxDelta(invalid, before)).not.toEqual(zero);
				expect(documentBoxDelta(invalid, invalid)).not.toEqual(zero);
			}
		});
	}
});

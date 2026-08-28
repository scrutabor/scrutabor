import { describe, expect, it } from 'vitest';
import type { Segment } from './corpus';
import { offersMassFormChoice, offersRoleChoice } from './reading-settings';

let n = 0;
const verse = (speaker: Segment['speaker'], extra: Partial<Segment> = {}): Segment =>
	({
		id: `s${++n}`,
		type: 'verse',
		speaker,
		words: [{ id: `w${n}` }],
		...extra
	}) as Segment;

describe('reading settings that have a visible effect', () => {
	it('offers neither Mass setting for a devotional ductor/populus dialogue', () => {
		const angelus = [verse('ductor'), verse('populus'), verse('ductor'), verse('populus')];
		expect(offersRoleChoice(angelus)).toBe(false);
		expect(offersMassFormChoice(angelus)).toBe(false);
	});

	it('keeps the role choice for a Mass dialogue without inventing a form difference', () => {
		const dialogue = [verse('sacerdos'), verse('minister')];
		expect(offersRoleChoice(dialogue)).toBe(true);
		expect(offersMassFormChoice(dialogue)).toBe(false);
	});

	it('offers Mass form when delivery changes', () => {
		const proper = [
			verse('sacerdos', { delivery: { cantu: { speaker: 'schola', voice: 'cantus' } } })
		];
		expect(offersMassFormChoice(proper)).toBe(true);
	});

	it('offers Mass form when participation changes its visible meaning', () => {
		const response = [
			verse('minister', {
				participation: {
					cantu: { gradus: 1, source: 'DMS 25 a' },
					lecta: { gradus: 3, source: 'DMS 31 b', conditional: true }
				}
			})
		];
		expect(offersMassFormChoice(response)).toBe(true);
	});

	it('does not expose editorial-only source or degree differences', () => {
		const ordinary = [1, 2].map(() =>
			verse('sacerdos', {
				participation: {
					cantu: { gradus: 2, source: 'DMS 25 b' },
					lecta: { gradus: 3, source: 'DMS 31 c' }
				}
			})
		);
		expect(offersMassFormChoice(ordinary)).toBe(false);
		expect(offersRoleChoice(ordinary)).toBe(false);
	});
});

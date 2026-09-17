import { describe, expect, it } from 'vitest';
import { interlinearRuns } from './interlinear';
import type { SegmentGloss, Word } from './corpus';

const words = ['est', 'futúrus', 'An'].map(
	(form, index) => ({ id: `w${index + 1}`, form, lemma: form, morph: { pos: 'verb' } }) as Word
);
const segment: SegmentGloss = {
	alignments: [
		{ words: ['w1', 'w2'], forms: ['est', 'futúrus'], anchor: 'w2', gloss: 'będzie' },
		{ words: ['w3'], forms: ['An'], reason: 'word-order' }
	]
};

describe('interlinear source runs', () => {
	it('keeps one target expression under the whole Latin construction', () => {
		const runs = interlinearRuns(words, segment);
		expect(runs).toHaveLength(2);
		expect(runs[0].words.map((word) => word.form)).toEqual(['est', 'futúrus']);
		expect(runs[0].alignment?.gloss).toBe('będzie');
		expect(runs[1].alignment?.reason).toBe('word-order');
	});

	it('leaves ordinary words as one-word runs', () => {
		expect(interlinearRuns(words)).toEqual(words.map((word) => ({ words: [word] })));
	});
});

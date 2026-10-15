/** Minimal corpus segments for the flow unit tests. */
import type { Segment } from './corpus';

export const verse = (
	id: string,
	count = 2,
	speaker: Segment['speaker'] = 'sacerdos'
): Segment => ({
	id,
	type: 'verse',
	speaker,
	words: Array.from({ length: count }, (_, i) => ({
		id: `${id}.w${i}`,
		form: `Verbum${i}`,
		lemma: 'verbum',
		morph: { pos: 'x' }
	}))
});

export const rubric = (id: string): Segment => ({ id, type: 'rubric', text: 'Hic genuflectitur.' });

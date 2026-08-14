import { describe, expect, it } from 'vitest';
import type { GlossDocument, Segment } from './corpus';
import { collectTranslationCitations, repeatedResponsePlan } from './reading-text';

let nextId = 0;
const verse = (speaker: Segment['speaker'], text: string): Segment => ({
	id: `s${++nextId}`,
	type: 'verse',
	speaker,
	words: text.split(' ').map((form, index) => ({
		id: `w${nextId}-${index}`,
		form,
		lemma: form,
		morph: { pos: 'x' }
	}))
});
const rubric = (): Segment => ({ id: `r${++nextId}`, type: 'rubric', text: '…' });

describe('compact litany responses', () => {
	it('prints one response for a long alternating series', () => {
		const first = verse('populus', 'Ora pro nobis.');
		const second = verse('populus', 'Ora pro nobis.');
		const third = verse('populus', 'Ora pro nobis.');
		const segments = [
			verse('ductor', 'Sancta Maria.'),
			first,
			verse('ductor', 'Sancta Dei Genetrix.'),
			second,
			verse('ductor', 'Sancta Virgo virginum.'),
			third
		];

		expect(repeatedResponsePlan(segments)).toEqual({
			continued: [first.id],
			omitted: [second.id, third.id]
		});
	});

	it('keeps short repetition and starts again after a rubric', () => {
		const firstPair = [verse('populus', 'Miserere nobis.'), verse('populus', 'Miserere nobis.')];
		const secondRun = [
			verse('populus', 'Miserere nobis.'),
			verse('populus', 'Miserere nobis.'),
			verse('populus', 'Miserere nobis.')
		];
		const segments = [
			firstPair[0],
			verse('ductor', 'Fili Deus.'),
			firstPair[1],
			rubric(),
			secondRun[0],
			verse('ductor', 'Cor Iesu.'),
			secondRun[1],
			verse('ductor', 'Cor Iesu.'),
			secondRun[2]
		];

		expect(repeatedResponsePlan(segments)).toEqual({
			continued: [secondRun[0].id],
			omitted: [secondRun[1].id, secondRun[2].id]
		});
	});

	it('does not treat unattributed Kyrie lines as a response series', () => {
		const segments = [
			verse(undefined, 'Kyrie eleison.'),
			verse(undefined, 'Kyrie eleison.'),
			verse(undefined, 'Kyrie eleison.')
		];
		expect(repeatedResponsePlan(segments)).toEqual({ continued: [], omitted: [] });
	});
});

describe('prayer-level translation sources', () => {
	it('groups one source while retaining its distinct locators', () => {
		const segments = [verse(undefined, 'Primus.'), verse(undefined, 'Secundus.')];
		const source = { title: 'Book', locator: 'p. 1', url: 'https://example.com/book' };
		const gloss = {
			segments: {
				[segments[0].id]: { translation_citations: [source] },
				[segments[1].id]: {
					translation_citations: [source, { ...source, locator: 'p. 2' }]
				}
			}
		} as unknown as GlossDocument;

		expect(collectTranslationCitations(segments, gloss)).toEqual([
			{ ...source, locator: 'p. 1; p. 2' }
		]);
	});
});

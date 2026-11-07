import { describe, expect, it } from 'vitest';
import type { GlossDocument, Segment } from './corpus';
import {
	collectTranslationCitations,
	collectTranslationRelationships,
	litanyRows
} from './reading-text';

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
	it('pairs every invocation with its exact adjacent response', () => {
		const segments = [
			verse(undefined, 'Kyrie eleison.'),
			verse('ductor', 'Sancta Dei Genetrix.'),
			verse('populus', 'Ora pro nobis.'),
			verse('ductor', 'Sancti Petre et Paule.'),
			verse('populus', 'Orate pro nobis.'),
			verse('ductor', 'Ut nobis parcas.'),
			verse('populus', 'Te rogamus audi nos.')
		];

		expect(litanyRows(segments)).toEqual([
			{ primary: 0 },
			{ primary: 1, response: 2 },
			{ primary: 3, response: 4 },
			{ primary: 5, response: 6 }
		]);
	});

	it('does not pair across a rubric or consume an unpaired verse', () => {
		const segments = [
			verse('ductor', 'Fili Deus.'),
			rubric(),
			verse('ductor', 'Cor Iesu.'),
			verse('populus', 'Miserere nobis.'),
			verse('ductor', 'Cor Iesu.'),
			verse('populus', 'Miserere nobis.')
		];

		expect(litanyRows(segments)).toEqual([
			{ primary: 0 },
			{ primary: 1 },
			{ primary: 2, response: 3 },
			{ primary: 4, response: 5 }
		]);
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

	it('does not describe mixed historical relationships as one prayer-wide claim', () => {
		const segments = [verse(undefined, 'Primus.'), verse(undefined, 'Secundus.')];
		const gloss = {
			segments: {
				[segments[0].id]: { translation_relationship: 'traditional-composite' },
				[segments[1].id]: { translation_relationship: 'revised' }
			}
		} as unknown as GlossDocument;

		expect(collectTranslationRelationships(segments, gloss)).toEqual([]);
	});
});

describe('scope of a prayer-level source description', () => {
	const segments = [verse(undefined, 'Prima.'), verse(undefined, 'Secunda.')];
	it('does not promote one attested ending to a claim about the complete prayer', () => {
		const gloss = {
			segments: { [segments[1].id]: { translation_relationship: 'exact' } }
		} as unknown as GlossDocument;
		expect(collectTranslationRelationships(segments, gloss)).toEqual([]);
	});
	it('preserves a supported description shared by every verse, ignoring rubrics', () => {
		const gloss = {
			segments: Object.fromEntries(
				segments.map(({ id }) => [id, { translation_relationship: 'normalized' }])
			)
		} as unknown as GlossDocument;
		expect(collectTranslationRelationships([rubric(), ...segments], gloss)).toEqual(['normalized']);
	});
	it('does not infer a relationship from an empty text', () => {
		expect(collectTranslationRelationships([], { segments: {} } as GlossDocument)).toEqual([]);
	});
});

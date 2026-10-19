import { describe, expect, it } from 'vitest';
import type { GlossDocument, Segment, TextDocument } from './corpus';
import { flowBinding, textFlowFor } from './reading-flow';
import { rubric, verse as segment } from './text-flow.fixture';

const defaults = { confidence: 'editorial', sources: [], review: 'pending' };
const verse = (id: string, speaker: Segment['speaker'] = 'sacerdos', count = 3): Segment =>
	segment(id, count, speaker);
const doc = (segments: Segment[]): TextDocument => ({
	schema_version: '0.21.0',
	id: 'test.flow',
	title: 'Flow',
	status: 'working-edition',
	analysis_defaults: defaults,
	analysis_defaults_words: defaults,
	segments
});
const gloss = (translated: string[] = []): GlossDocument => ({
	schema_version: '0.21.0',
	text: 'test.flow',
	lang: 'en',
	status: 'working-edition',
	analysis_defaults: defaults,
	segments: Object.fromEntries(translated.map((id) => [id, { translation: 'A line.' }])),
	words: {}
});

describe('the flow binding', () => {
	it('names the edge rows a neighbour needs', () => {
		const flow = textFlowFor(
			doc([rubric('s01'), verse('s02'), verse('s03')]),
			gloss(),
			{ helpLevel: 0 },
			'cantu',
			'populus'
		);
		expect(flow.first?.rubric).toBe(true);
		expect(flow.last?.row.primary).toBe(2);
		expect(flow.last?.rubric).toBe(false);
	});
	it('marks a translated last row only when translations show', () => {
		const text = doc([verse('s01'), verse('s02')]);
		expect(
			textFlowFor(text, gloss(['s02']), { helpLevel: 2 }, 'cantu', 'populus').last?.translated
		).toBe(true);
		expect(
			textFlowFor(text, gloss(['s02']), { helpLevel: 0 }, 'cantu', 'populus').last?.translated
		).toBe(false);
	});
	it('binds the same speaker naming TextBody renders', () => {
		// A dialogue names its speakers; a one-voice prayer names none by default.
		const dialogue = flowBinding(
			doc([verse('s01', 'sacerdos'), verse('s02', 'minister')]),
			gloss(),
			{ helpLevel: 0 },
			'cantu',
			'populus'
		);
		expect([0, 1].map((i) => dialogue.options.namesWho(i))).toEqual([true, true]);
		const quiet = flowBinding(
			doc([verse('s01', 'sacerdos'), verse('s02', 'minister')]),
			gloss(),
			{ helpLevel: 0, showSpeakerNames: false },
			'cantu',
			'populus'
		);
		expect([0, 1].map((i) => quiet.options.namesWho(i))).toEqual([false, false]);
	});
	it('gives an empty document no edges', () => {
		const flow = textFlowFor(doc([]), gloss(), { helpLevel: 1 }, 'lecta', 'sacerdos');
		expect(flow.first).toBeUndefined();
		expect(flow.last).toBeUndefined();
	});
});

describe('retained reference words', () => {
	it.each(['lecta', 'cantu'] as const)(
		'removes current actor cues without changing %s segments',
		(form) => {
			const source = doc([
				{
					...verse('s01', 'minister'),
					voice: 'submissa',
					participation: {
						lecta: { gradus: 1, source: 'DMS 31 a' },
						cantu: { gradus: 1, source: 'DMS 25 a' }
					}
				}
			]);
			const before = structuredClone(source);
			for (const who of ['populus', 'minister', 'sacerdos'] as const) {
				const active = flowBinding(source, gloss(), { helpLevel: 0 }, form, who);
				const reference = flowBinding(
					source,
					gloss(),
					{ helpLevel: 0, referenceOnly: true },
					form,
					who
				);
				expect(active.options.namesWho(0)).toBe(true);
				expect(active.options.response(0)).toBe(true);
				expect(reference.options.namesWho(0)).toBe(false);
				expect(reference.options.response(0)).toBe(false);
				expect(reference.sharedPrayer).toBe(false);
				expect(reference.segs).toEqual(active.segs);
			}
			expect(source).toEqual(before);
		}
	);
});

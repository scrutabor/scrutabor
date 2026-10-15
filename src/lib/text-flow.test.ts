import { describe, expect, it } from 'vitest';
import type { Segment } from './corpus';
import { textFlowUnits } from './text-flow';
import { litanyRows } from './reading-text';

const verse = (id: string, count = 2, speaker: Segment['speaker'] = 'sacerdos'): Segment => ({
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
const rubric = (id: string): Segment => ({ id, type: 'rubric', text: 'Hic genuflectitur.' });
const plan = (
	segments: Segment[],
	options: {
		paired?: boolean;
		hidden?: boolean;
		responses?: string[];
		who?: string[];
		translated?: string[];
	} = {}
) =>
	textFlowUnits(
		segments,
		options.paired ? litanyRows(segments) : segments.map((_, primary) => ({ primary })),
		{
			hideOpeningRubric: options.hidden ?? false,
			namesWho: (i) => options.who?.includes(segments[i].id) ?? false,
			translated: (i) => options.translated?.includes(segments[i].id) ?? false,
			response: (i) => options.responses?.includes(segments[i].id) ?? false
		}
	);
const indexes = (units: ReturnType<typeof plan>['opening']) =>
	units.map((unit) => unit.rows.map((row) => row.row.primary));

describe('bounded actual-row print units', () => {
	it('partitions every leading rubric and long first sacred row without keeping it', () => {
		const result = plan([rubric('r0'), rubric('r1'), verse('long', 170), verse('next', 40)]);
		expect(indexes(result.opening)).toEqual([[0], [1], [2]]);
		expect(indexes(result.continuation)).toEqual([[3]]);
		expect(result.opening.every((unit) => !unit.keep)).toBe(true);
		expect(result.compactOpening).toBe(false);
	});
	it('opens a multi-verse prayer with only its first actual verse', () => {
		const result = plan([rubric('r0'), verse('s1'), verse('s2'), verse('s3')]);
		expect(indexes(result.opening)).toEqual([[0, 1]]);
		expect(indexes(result.continuation)).toEqual([[2], [3]]);
	});
	it('does not keep a 170-word first verse merely because another verse follows', () => {
		const result = plan([rubric('r0'), verse('epiphany', 170), verse('s2', 32)]);
		expect(indexes(result.opening)).toEqual([[0], [1]]);
		expect(indexes(result.continuation)).toEqual([[2]]);
		expect([...result.opening, ...result.continuation].every((unit) => !unit.keep)).toBe(true);
		expect(result.compactOpening).toBe(false);
	});
	it('keeps a rubric forward without boxing a long internal verse', () => {
		const result = plan([verse('s1'), rubric('hic'), verse('s2', 170), verse('s3')]);
		expect(indexes(result.continuation)).toEqual([[1], [2], [3]]);
		expect(result.continuation.every((unit) => !unit.keep)).toBe(true);
		expect(result.continuation[0].rows[0].terminal).toBe(false);
	});
	it('protects a short single response such as Laus', () => {
		expect(indexes(plan([verse('laus', 3)]).opening)).toEqual([[0]]);
	});
	it('keeps a long single Gospel outside a nonbreaking opening', () => {
		const result = plan([rubric('r0'), verse('gospel', 200)]);
		expect(indexes(result.opening)).toEqual([[0], [1]]);
		expect(result.continuation).toEqual([]);
		expect(result.opening.every((unit) => !unit.keep)).toBe(true);
		expect(result.compactOpening).toBe(false);
	});
	it('exercises the exact 12 versus 13 source-word boundary', () => {
		expect(plan([verse('twelve', 12)]).compactOpening).toBe(true);
		expect(plan([verse('thirteen', 13)]).compactOpening).toBe(false);
		expect(plan([verse('thirteen', 13)]).opening[0].keep).toBe(false);
	});
	it('joins an internal rubric only to the next actual verse', () => {
		const result = plan([verse('s1'), rubric('r1'), verse('s2'), verse('s3')]);
		expect(indexes(result.continuation)).toEqual([[1, 2], [3]]);
		expect(result.continuation[0].kind).toBe('instruction');
	});
	it('joins a complete consecutive forward-rubric run', () => {
		expect(
			indexes(plan([verse('s1'), rubric('r1'), rubric('r2'), verse('s2')]).continuation)
		).toEqual([[1, 2, 3]]);
	});
	it('keeps a terminal note separate and marks its backward direction', () => {
		const result = plan([verse('deus', 40), rubric('defunctorum')]);
		expect(indexes(result.opening)).toEqual([[0]]);
		expect(indexes(result.continuation)).toEqual([[1]]);
		expect(result.continuation[0].kind).toBe('terminal');
		expect(result.continuation[0].rows[0].terminal).toBe(true);
		expect(result.continuation[0].keep).toBe(false);
	});
	it('does not connect a terminal note to a different body', () => {
		const first = plan([verse('deus', 40), rubric('note')]);
		const next = plan([verse('offerimus', 50)]);
		expect(first.continuation.at(-1)?.rows.map((row) => row.row.primary)).toEqual([1]);
		expect(next.opening[0].key).toBe('offerimus');
	});
	it('joins a short final response backward to a short invocation', () => {
		const result = plan([verse('long', 200), verse('peromnia', 4), verse('amen', 1, 'minister')], {
			responses: ['amen']
		});
		expect(indexes(result.opening)).toEqual([[0]]);
		expect(indexes(result.continuation)).toEqual([[1, 2]]);
		expect(result.continuation[0].kind).toBe('response');
		expect(result.responseRow).toBe(2);
	});
	it('retains backward response avoidance after a long invocation without boxing it', () => {
		const result = plan([verse('long', 200), verse('amen', 1, 'minister')], {
			responses: ['amen']
		});
		expect(indexes(result.opening)).toEqual([[0]]);
		expect(indexes(result.continuation)).toEqual([[1]]);
		expect(result.responseRow).toBe(1);
		expect(result.opening[0].keep).toBe(false);
	});
	it('does not pair an answer through an intervening rubric', () => {
		const result = plan([verse('s1'), rubric('r1'), verse('amen', 1, 'minister')], {
			responses: ['amen']
		});
		expect(indexes(result.continuation)).toEqual([[1, 2]]);
		expect(result.continuation[0].kind).toBe('instruction');
	});
	it('does not infer an everyone response from speaker or spelling', () => {
		const result = plan([verse('s1'), verse('amen', 1, 'minister')]);
		expect(result.responseRow).toBe(undefined);
		expect(indexes(result.continuation)).toEqual([[1]]);
	});
	it('keeps a directly declared terminal everyone response with its short invocation', () => {
		const result = plan([verse('invoke', 3, undefined), verse('answer', 2, 'omnes')]);
		expect(indexes(result.opening)).toEqual([[0, 1]]);
		expect(result.compactOpening).toBe(true);
		expect(result.responseRow).toBe(1);
	});
	it('does not infer a terminal pair from a nonterminal everyone row', () => {
		const result = plan([verse('invoke', 3), verse('middle', 2, 'omnes'), verse('later', 3)]);
		expect(indexes(result.opening)).toEqual([[0]]);
		expect(indexes(result.continuation)).toEqual([[1], [2]]);
		expect(result.responseRow).toBe(undefined);
	});
	it('does not convert a continuous everyone prayer into a terminal response', () => {
		const result = plan([
			verse('first', 3, 'omnes'),
			verse('next', 4, 'omnes'),
			verse('last', 5, 'omnes')
		]);
		expect(indexes(result.continuation)).toEqual([[1], [2]]);
		expect(result.responseRow).toBe(undefined);
		expect(result.continuation.every((unit) => !unit.keep)).toBe(true);
	});
	it('does not invent a response for a single everyone prayer', () => {
		const result = plan([verse('single', 3, 'omnes')]);
		expect(result.responseRow).toBe(undefined);
		expect(result.compactOpening).toBe(true);
	});
	it('retains an explicit participation response even with one source row', () => {
		const result = plan([verse('single', 3, 'omnes')], { responses: ['single'] });
		expect(result.responseRow).toBe(0);
	});
	it('does not keep a declared everyone pair when either source row exceeds twelve words', () => {
		for (const [invocation, response] of [
			[13, 2],
			[3, 13]
		]) {
			const result = plan([verse('invoke', invocation), verse('answer', response, 'omnes')]);
			expect(indexes([...result.opening, ...result.continuation])).toEqual([[0], [1]]);
			expect(result.responseRow).toBe(1);
			expect(
				[...result.opening, ...result.continuation].find(
					(unit) => unit.rows[0].row.primary === (invocation > 12 ? 0 : 1)
				)?.keep
			).toBe(false);
		}
	});
	it('uses paired litany rows rather than source-array adjacency', () => {
		const segments = [
			rubric('r0'),
			verse('invoke', 3, 'ductor'),
			verse('answer', 3, 'populus'),
			rubric('r1'),
			verse('invoke2', 4, 'ductor'),
			verse('answer2', 3, 'populus')
		];
		const result = plan(segments, { paired: true });
		expect(indexes(result.opening)).toEqual([[0, 1]]);
		expect(result.opening[0].rows[1].row.response).toBe(2);
		expect(indexes(result.continuation)).toEqual([[3, 4]]);
		expect(result.continuation[0].rows[1].row.response).toBe(5);
	});
	it('does not treat a paired row as an ordinary preceding verse box', () => {
		const result = plan(
			[verse('invoke', 3, 'ductor'), verse('answer', 3, 'populus'), rubric('r1'), verse('s2')],
			{ paired: true }
		);
		expect(result.continuation[0].rows[0].before).toBe(null);
	});
	it('keeps hidden opening anchors once at the source opening', () => {
		const result = plan([rubric('r0'), verse('s1'), verse('s2')], { hidden: true });
		expect(indexes(result.opening)).toEqual([[0, 1]]);
		expect(result.opening[0].rows[0].hidden).toBe(true);
		expect(result.opening[0].rows[1].before).toBe('hidden');
	});
	it('keeps a hidden opening anchor once before a fragmentable long first row', () => {
		const result = plan([rubric('anchor'), verse('long', 170), verse('next', 32)], {
			hidden: true
		});
		expect(indexes(result.opening)).toEqual([[0], [1]]);
		expect(result.opening[0].rows[0].hidden).toBe(true);
		expect(result.opening[1].rows[0].before).toBe('hidden');
		expect(result.compactOpening).toBe(false);
	});
	it('keeps whole-document edge facts across opening and continuation', () => {
		const result = plan([verse('s1'), rubric('r1'), verse('s2')]);
		expect(result.opening[0].rows[0].last).toBe(false);
		expect(result.opening[0].rows[0].after).toBe('rubric');
		expect(result.continuation[0].rows[0].first).toBe(false);
		expect(result.continuation[0].rows.at(-1)?.last).toBe(true);
	});
	it('prices a speaker boundary from full-document metadata', () => {
		const result = plan([verse('s1'), verse('s2')], { who: ['s2'] });
		expect(result.opening[0].rows[0].after).toBe('who');
		expect(result.continuation[0].rows[0].before).toBe('verse');
	});
	it('keeps an internal short voice label with its own utterance', () => {
		const result = plan([verse('orate', 2), verse('ut-meum', 11), verse('later', 3)], {
			who: ['ut-meum']
		});
		expect(indexes(result.continuation)).toEqual([[1], [2]]);
		expect(result.continuation[0].keep).toBe(true);
		expect(result.continuation[1].keep).toBe(false);
	});
	it('keeps the voice association only through the existing source-word bound', () => {
		for (const count of [11, 12, 13, 170]) {
			const result = plan([verse('opening'), verse('voiced', count)], {
				who: ['voiced'],
				translated: ['voiced']
			});
			expect(result.continuation[0].keep).toBe(count <= 12);
			expect(indexes(result.continuation)).toEqual([[1]]);
		}
	});
	it('does not box an unlabelled short internal verse', () => {
		const result = plan([verse('opening'), verse('unlabelled', 11)]);
		expect(result.continuation[0].keep).toBe(false);
	});
	it('does not reuse an interlinear verse gap after a translated row', () => {
		const result = plan([verse('s1'), verse('s2')], { translated: ['s1'], who: ['s2'] });
		expect(result.continuation[0].rows[0].before).toBe(null);
	});
	it('retains every source segment exactly once without mutation', () => {
		const segments = [
			rubric('r0'),
			verse('s1'),
			rubric('r1'),
			verse('s2'),
			verse('s3'),
			rubric('tail')
		];
		const before = JSON.stringify(segments);
		const result = plan(segments);
		expect(
			[...result.opening, ...result.continuation].flatMap((unit) =>
				unit.rows.map((row) => row.row.primary)
			)
		).toEqual([0, 1, 2, 3, 4, 5]);
		expect(JSON.stringify(segments)).toBe(before);
	});
	it('returns empty output for an empty document rather than inventing an opening', () => {
		expect(plan([]).opening).toEqual([]);
		expect(plan([]).continuation).toEqual([]);
		expect(plan([]).compactOpening).toBe(false);
		expect(plan([]).responseRow).toBe(undefined);
	});
	it('keeps rubric-only fallback rows without claiming a preceding prayer', () => {
		const result = plan([rubric('only')]);
		expect(result.opening).toEqual([]);
		expect(result.compactOpening).toBe(false);
		expect(result.responseRow).toBe(undefined);
		expect(result.continuation[0].rows[0].terminal).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import {
	formatSegmentSelection,
	parseSegmentSelection,
	resolveWordAddress,
	segmentRange
} from './segment-selection';

const ids = ['s01', 's02', 'rubric', 's03', 's04'];

describe('segment selection URLs', () => {
	it('keeps one segment backward-compatible with search-result links', () => {
		expect(parseSegmentSelection('s02', ids)).toEqual(['s02']);
		expect(formatSegmentSelection(['s02'], ids)).toBe('s02');
	});

	it('encodes a continuous range in document order', () => {
		expect(segmentRange(ids, 's04', 's02')).toEqual(['s02', 'rubric', 's03', 's04']);
		expect(formatSegmentSelection(['s04', 's03', 'rubric', 's02'], ids)).toBe('s02-s04');
		expect(parseSegmentSelection('s02-s04', ids)).toEqual(['s02', 'rubric', 's03', 's04']);
	});

	it('rejects stale or malformed selectors', () => {
		expect(parseSegmentSelection('missing', ids)).toEqual([]);
		expect(parseSegmentSelection('s01-missing', ids)).toEqual([]);
		expect(parseSegmentSelection('s01-s02-s03', ids)).toEqual([]);
		expect(parseSegmentSelection('s01..s02', ids)).toEqual([]);
	});
});

describe('retired segment addresses', () => {
	const retired = { s90: 's02', s91: 's04' };

	it('resolves a retired id to the segment carrying its content', () => {
		expect(parseSegmentSelection('s90', ids, retired)).toEqual(['s02']);
	});

	it('resolves retired range endpoints', () => {
		expect(parseSegmentSelection('s90-s91', ids, retired)).toEqual(['s02', 'rubric', 's03', 's04']);
	});

	it('canonicalizes what it resolved', () => {
		const selected = parseSegmentSelection('s91-s90', ids, retired);
		expect(formatSegmentSelection(selected, ids)).toBe('s02-s04');
	});

	it('still rejects what nothing records', () => {
		expect(parseSegmentSelection('s99', ids, retired)).toEqual([]);
		expect(parseSegmentSelection('s90-s99', ids, retired)).toEqual([]);
		expect(parseSegmentSelection('s90', ids, { s90: 's99' })).toEqual([]);
	});

	it('follows immutable retirement chains and refuses cycles', () => {
		expect(parseSegmentSelection('s92', ids, { s92: 's90', s90: 's02' })).toEqual(['s02']);
		expect(parseSegmentSelection('s90', ids, { s90: 's91', s91: 's90' })).toEqual([]);
	});
});

describe('retired word addresses', () => {
	it('keeps live words and degrades retired ones to a live segment', () => {
		expect(resolveWordAddress('w001', ['w001'], ids)).toEqual({ word: 'w001' });
		expect(resolveWordAddress('w090', ['w001'], ids, { w090: 's90' }, { s90: 's02' })).toEqual({
			segment: 's02'
		});
	});

	it('rejects unknown words and retirement chains that resolve nowhere', () => {
		expect(resolveWordAddress('w090', ['w001'], ids)).toBeNull();
		expect(resolveWordAddress('w090', ['w001'], ids, { w090: 's99' })).toBeNull();
	});
});

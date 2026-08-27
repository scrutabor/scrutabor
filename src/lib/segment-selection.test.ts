import { describe, expect, it } from 'vitest';
import { formatSegmentSelection, parseSegmentSelection, segmentRange } from './segment-selection';

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

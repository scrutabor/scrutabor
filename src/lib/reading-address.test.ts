import { describe, expect, it } from 'vitest';
import {
	resolveCompositeAddress,
	resolveDocumentAddress,
	writeReadingAddress
} from './reading-address';

const doc = {
	segments: [
		{ id: 's01', words: [{ id: 'w001' }] },
		{ id: 's02', words: [{ id: 'w002' }] },
		{ id: 's03', words: [{ id: 'w003' }] }
	],
	retired_words: { w090: 's90', w091: 'w002', w092: 'missing' },
	retired_segments: { s90: 's01' }
};
const parts = [
	{ slug: 'prayer', anchor: 'text-proprium-prayer', doc },
	{ slug: 'prayer~communio', anchor: 'text-proprium-prayer~communio', doc },
	{ slug: 'other', anchor: 'text-proprium-other', doc }
];

describe('writing resolved addresses', () => {
	it('changes only the word and segment selectors', () => {
		const url = new URL(
			'https://example.test/book?dies=2026-09-21&formularium=mass&w=old&s=old#part'
		);
		writeReadingAddress(url, { word: 'prayer.w002', segment: 'prayer.s02-s03' });
		expect(url.searchParams.get('w')).toBe('prayer.w002');
		expect(url.searchParams.get('s')).toBe('prayer.s02-s03');
		expect(url.searchParams.get('dies')).toBe('2026-09-21');
		expect(url.searchParams.get('formularium')).toBe('mass');
		expect(url.hash).toBe('#part');
	});
	it('removes stale selectors without dropping the other valid selector', () => {
		const url = new URL('https://example.test/book?w=old&s=old');
		writeReadingAddress(url, { word: null, segment: 's01' });
		expect(url.search).toBe('?s=s01');
		writeReadingAddress(url, { word: 'w002', segment: null });
		expect(url.search).toBe('?w=w002');
		writeReadingAddress(url, { word: null, segment: null });
		expect(url.search).toBe('');
	});
});

describe('document addresses', () => {
	it('degrades a retired word to its surviving segment', () => {
		expect(resolveDocumentAddress(doc, 'w090', null)).toEqual({
			word: null,
			segment: 's01',
			segments: ['s01']
		});
	});
	it('preserves a valid explicit range ahead of a retired word fallback', () => {
		expect(resolveDocumentAddress(doc, 'w090', 's03-s02')).toEqual({
			word: null,
			segment: 's02-s03',
			segments: ['s02', 's03']
		});
	});
	it('uses the word fallback when the explicit segment is stale', () => {
		expect(resolveDocumentAddress(doc, 'w090', 'missing').segment).toBe('s01');
	});
	it('keeps a live replacement panel beside an explicit segment', () => {
		expect(resolveDocumentAddress(doc, 'w091', 's90')).toEqual({
			word: 'w002',
			segment: 's01',
			segments: ['s01']
		});
	});
	it('does not fabricate a destination for an unknown word', () => {
		expect(resolveDocumentAddress(doc, 'w092', 's03')).toEqual({
			word: null,
			segment: 's03',
			segments: ['s03']
		});
		expect(resolveDocumentAddress(doc, 'missing', 'missing')).toEqual({
			word: null,
			segment: null,
			segments: []
		});
	});
});

describe('composite addresses', () => {
	it.each(['prayer', 'prayer~communio'])(
		'retains the exact occurrence namespace for %s',
		(slug) => {
			expect(resolveCompositeAddress(parts, `${slug}.w090`, null, '')).toEqual({
				word: null,
				segment: `${slug}.s01`,
				segments: ['s01'],
				part: slug
			});
			expect(resolveCompositeAddress(parts, `${slug}.w091`, null, '').word).toBe(`${slug}.w002`);
		}
	);
	it.each(['prayer', 'prayer~communio'])(
		'resolves bare redirected words beside the %s fragment',
		(slug) => {
			expect(resolveCompositeAddress(parts, 'w090', null, `#text-proprium-${slug}`).segment).toBe(
				`${slug}.s01`
			);
			expect(resolveCompositeAddress(parts, 'w091', null, `#text-proprium-${slug}`).word).toBe(
				`${slug}.w002`
			);
		}
	);
	it('never guesses a part from a bare id or a wrong fragment', () => {
		for (const hash of ['', '#unknown']) {
			expect(resolveCompositeAddress(parts, 'w090', 's01', hash)).toEqual({
				word: null,
				segment: null,
				segments: [],
				part: null
			});
		}
	});
	it('lets the qualified address win over a different fragment', () => {
		expect(
			resolveCompositeAddress(parts, 'prayer~communio.w090', null, '#text-proprium-other').part
		).toBe('prayer~communio');
	});
	it('keeps a valid explicit citation even when it names another part', () => {
		expect(resolveCompositeAddress(parts, 'prayer.w090', 'other.s03-s02', '')).toEqual({
			word: null,
			segment: 'other.s02-s03',
			segments: ['s02', 's03'],
			part: 'other'
		});
	});
	it('resolves both redirected selectors in one result', () => {
		expect(resolveCompositeAddress(parts, 'w091', 's03-s02', '#text-proprium-prayer')).toEqual({
			word: 'prayer.w002',
			segment: 'prayer.s02-s03',
			segments: ['s02', 's03'],
			part: 'prayer'
		});
	});
	it('uses a valid fallback when the explicit selector cannot resolve', () => {
		expect(resolveCompositeAddress(parts, 'prayer.w090', 'other.s999', '').segment).toBe(
			'prayer.s01'
		);
	});
	it.each(['unknown.w090', 'prayer.w999', 'prayer.w092', 'prayer..w090', 'prayer~missing.w090'])(
		'rejects stale or malformed %s without dropping a good segment',
		(word) => {
			expect(resolveCompositeAddress(parts, word, 'other.s02', '')).toEqual({
				word: null,
				segment: 'other.s02',
				segments: ['s02'],
				part: 'other'
			});
		}
	);
});

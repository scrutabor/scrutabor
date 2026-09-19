import { expect, it } from 'vitest';
import { indexOccurrenceWords, properOccurrences } from './proper-occurrences';
import { PROPER_DAYS } from './proprium';

it('indexes repeated words by occurrence while preserving their exact reading data', () => {
	const word = { id: 'w001', form: 'Amen', lemma: 'amen', morph: { pos: 'intj' } };
	const doc = { segments: [{ words: [word] }, {}] };
	const gloss = { language: 'pl' };
	const first = { slug: 'prayer', doc, gloss };
	const second = { slug: 'prayer~communio', doc, gloss };
	const indexed = indexOccurrenceWords([first, second]);
	expect([...indexed.keys()]).toEqual(['prayer.w001', 'prayer~communio.w001']);
	expect(indexed.get('prayer.w001')).toEqual({ ...first, word });
	expect(indexed.get('prayer~communio.w001')).toEqual({ ...second, word });
	expect(indexed.get('prayer.w001')?.doc).toBe(doc);
	expect(indexed.get('prayer.w001')?.gloss).toBe(gloss);
	expect(indexed.get('prayer.w001')?.word).toBe(word);
	expect(indexOccurrenceWords([]).size).toBe(0);
});

it('keeps both occurrences without aliasing their word and fragment addresses', () => {
	const parts = [
		{ key: 'proprium/example-offertorium', part: 'offertorium' },
		{ key: 'proprium/example-offertorium', part: 'communio' }
	];
	const addressed = properOccurrences(parts);
	expect(addressed.map((p) => p.slug)).toEqual([
		'example-offertorium',
		'example-offertorium~communio'
	]);
	expect(addressed.map((p) => p.anchor)).toEqual([
		'text-proprium-example-offertorium',
		'text-proprium-example-offertorium~communio'
	]);
	expect(addressed.map((p) => p.key)).toEqual(parts.map((p) => p.key));
	expect(properOccurrences(parts)).toEqual(addressed);
});

it('gives every component of every Mass a distinct reader address', () => {
	for (const day of PROPER_DAYS) {
		const parts = properOccurrences(day.components.map((p) => ({ key: p.text, part: p.role })));
		for (const field of ['slug', 'anchor'] as const) {
			expect(new Set(parts.map((p) => p[field])).size, day.id).toBe(parts.length);
		}
	}
});

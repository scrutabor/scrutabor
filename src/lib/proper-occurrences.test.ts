import { expect, it } from 'vitest';
import { properOccurrences } from './proper-occurrences';
import { PROPER_DAYS } from './proprium';

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

// When the target-language index cannot be fetched, search must degrade to
// what is already resident — titles and Latin — say so, and stay retryable.
// It must NOT fail whole: that was the "This edition could not be searched"
// dead end a single flaky request used to cause for a session.
import { describe, expect, it, vi } from 'vitest';

vi.mock('./corpus-metadata', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./corpus-metadata')>();
	return {
		...actual,
		// The Polish index resolves to a path no module carries, so its
		// loader is absent and every fetch of it fails — deterministically.
		languageConcordancePath: (lang: string) =>
			lang === 'pl'
				? 'languages/pl/never-built.json'
				: actual.languageConcordancePath(lang as never)
	};
});

import { searchBook } from './search';

describe('search without its language index', () => {
	it('still answers with titles and Latin, and says it degraded', async () => {
		const results = await searchBook('Pater noster', 'pl');
		expect(results.degraded).toBe(true);
		expect(results.titles[0]?.textKey).toBe('orationes/pater-noster');
		expect(results.contents.length, 'Latin index still answers').toBeGreaterThan(0);
		expect(results.contents.every(({ source }) => source === 'la')).toBe(true);
	});

	it('leaves the other language untouched', async () => {
		const results = await searchBook('handmaid', 'en');
		expect(results.degraded).toBe(false);
		expect(results.contents.some(({ source }) => source === 'en')).toBe(true);
	});
});

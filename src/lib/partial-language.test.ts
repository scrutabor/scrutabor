// The contract for a PARTIAL language package, proven against a simulated
// one (no untranslated production content is added for this): the landing
// falls back to a covered specimen or none, and search offers only pages
// the package can open. Both packages ship complete today; these tests are
// what keeps the next language from being blocked by Psalm 118 or served
// dead-end results.
import { describe, expect, it, vi } from 'vitest';

const COVERED = ['orationes/gloria-patri', 'orationes/ave-maria'];

vi.mock('./corpus-metadata', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./corpus-metadata')>();
	return {
		...actual,
		textKeysFor: (lang: string) => (lang === 'en' ? COVERED : actual.textKeysFor(lang as never))
	};
});

import { loadText } from './corpus';
import { pickSpecimen, PREFERRED } from './specimen';
import { searchBook } from './search';

describe('a partial language package', () => {
	it('lands on a covered specimen instead of requiring the psalm', async () => {
		// The loader refuses the preferred key, as a package without the
		// psalm would; the fallback walks the package's own shelf.
		const load = (key: string, lang: 'pl' | 'en') =>
			key === PREFERRED.key ? Promise.resolve(undefined) : loadText(key, lang);
		const specimen = await pickSpecimen('en', load);
		expect(specimen).not.toBeNull();
		expect(COVERED).toContain(specimen!.doc.id.replace('.', '/'));
		expect(specimen!.doc.segments).toHaveLength(1);
		expect(Object.keys(specimen!.gloss.segments)).toHaveLength(1);
	});

	it('yields null rather than an error when nothing is covered', async () => {
		const specimen = await pickSpecimen('en', () => Promise.resolve(undefined));
		expect(specimen).toBeNull();
	});

	it('keeps the full specimen where the package carries the psalm', async () => {
		const specimen = await pickSpecimen('pl', loadText);
		expect(specimen?.doc.id).toBe('psalmi.118-he');
		expect(specimen?.doc.segments[0]?.id).toBe(PREFERRED.verse);
	});

	it('offers only titles the package can open', async () => {
		const results = await searchBook('Pater noster', 'en');
		expect(results.titles.map(({ textKey }) => textKey)).not.toContain('orationes/pater-noster');
		const covered = await searchBook('Gloria Patri', 'en');
		expect(covered.titles.map(({ textKey }) => textKey)).toContain('orationes/gloria-patri');
	});
});

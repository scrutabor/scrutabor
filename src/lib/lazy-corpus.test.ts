import { describe, expect, it } from 'vitest';
import { addressesForLatinForm, textsForLatinForm } from './concordance';
import { loadText, loadedTextKeys } from './corpus';

describe('lazy corpus loading', () => {
	it('uses concordance postings without opening candidate documents', () => {
		expect(loadedTextKeys()).toEqual([]);
		expect(textsForLatinForm('Dóminus').length).toBeGreaterThan(1);
		expect(addressesForLatinForm('cælos')).toContainEqual({
			textKey: 'orationes/symbolum-apostolorum',
			wordId: 'w047'
		});
		expect(loadedTextKeys()).toEqual([]);
	});

	it('loads and caches exactly the requested text', async () => {
		const first = await loadText('orationes/memorare');
		expect(first?.text.title).toBe('Memoráre');
		expect(loadedTextKeys()).toEqual(['orationes/memorare']);
		expect(await loadText('orationes/memorare')).toBe(first);
		expect(loadedTextKeys()).toEqual(['orationes/memorare']);
	});
});

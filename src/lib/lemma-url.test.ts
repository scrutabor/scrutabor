import { describe, expect, it } from 'vitest';
import heads from './data/lexicon/heads.json';
import { externalDictionaryHref, lemmaHref } from './lemma-url';

describe('dictionary addresses', () => {
	it.each([
		['hic_adverbium', 'hic'],
		['edo_proferre', 'edo'],
		['labor_labi', 'labor'],
		['os_ossis', 'os'],
		['oro', 'oro'],
		['Clemens', 'Clemens'],
		['clemens', 'clemens']
	])('looks up %s externally without changing its internal identity', (key, lookup) => {
		expect(externalDictionaryHref(key)).toBe(`https://logeion.uchicago.edu/${lookup}`);
		for (const lang of ['pl', 'en'] as const) {
			expect(lemmaHref(lang, key)).toBe(`/app/${lang}/lemma?l=${key}`);
		}
	});

	it('matches every discriminated corpus key to its displayed lexical head', () => {
		const discriminated = Object.entries(heads.entries).filter(([key]) => key.includes('_'));
		expect(discriminated.length).toBeGreaterThan(0);
		for (const [key, entry] of discriminated) {
			const lookup = entry.head
				.split(',')[0]
				.trim()
				.normalize('NFD')
				.replace(/\p{M}/gu, '')
				.replaceAll('æ', 'ae')
				.replaceAll('œ', 'oe');
			expect(externalDictionaryHref(key), key).toBe(
				`https://logeion.uchicago.edu/${encodeURIComponent(lookup)}`
			);
		}
	});

	it('encodes the external path component and the internal query independently', () => {
		expect(externalDictionaryHref('a/b')).toBe('https://logeion.uchicago.edu/a%2Fb');
		expect(lemmaHref('en', 'a/b')).toBe('/app/en/lemma?l=a%2Fb');
	});
});

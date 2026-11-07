import { afterEach, describe, expect, it, vi } from 'vitest';
import { langOfPath, ownsLocation } from './url';

afterEach(() => vi.unstubAllGlobals());

describe('ownsLocation', () => {
	for (const lang of ['pl', 'en']) {
		const route = `/${lang}/ordo/catechumenorum`;
		for (const edition of ['hosted', 'folder']) {
			it(`${lang} ${edition}: owns its exact route with a word, segment, day and inner fragment`, () => {
				vi.stubGlobal('window', edition === 'folder' ? { __scrutabor_up: true } : {});
				const logical = `${route}?dies=2026-09-21&w=pater-noster.w001&s=pater-noster.s02#text-pater-noster`;
				vi.stubGlobal(
					'location',
					new URL(
						edition === 'folder'
							? `file:///book/index.html#${logical}`
							: `https://example.test/app${logical}`
					)
				);
				expect(ownsLocation(route)).toBe(true);
				expect(ownsLocation(`/${lang}/ordo`)).toBe(false);
				expect(ownsLocation(`/${lang}/ordo/canon`)).toBe(false);
				expect(ownsLocation(`/${lang === 'pl' ? 'en' : 'pl'}/ordo/catechumenorum`)).toBe(false);
				expect(ownsLocation(`/${lang}/orationes/pater-noster`)).toBe(false);
			});
		}
	}

	it('does not claim another page because its query or fragment names the owner', () => {
		vi.stubGlobal('window', {});
		vi.stubGlobal(
			'location',
			new URL(
				'https://example.test/app/en/orationes/pater-noster?from=/en/ordo/canon#/en/ordo/canon'
			)
		);
		expect(ownsLocation('/en/ordo/canon')).toBe(false);
	});
});

describe('langOfPath', () => {
	it('reads the language by segment, not by substring', () => {
		// '/app/en/lemma?l=plenus'.includes('/pl') is true — the defect this
		// function replaced answered Polish to English readers on every lemma
		// beginning pl- (plenus, plebs, placeat).
		expect(langOfPath('/app/en/lemma?l=plenus')).toBe('en');
		expect(langOfPath('/app/en/lemma?l=plebs')).toBe('en');
		expect(langOfPath('/app/en/lemma?l=placeat')).toBe('en');
	});

	it('answers each language on its own pages', () => {
		expect(langOfPath('/pl')).toBe('pl');
		expect(langOfPath('/en')).toBe('en');
		expect(langOfPath('/app/pl/ordinarium/credo')).toBe('pl');
		expect(langOfPath('/app/en/ordo/canon')).toBe('en');
	});

	it('defaults to English where no segment speaks, as x-default does', () => {
		expect(langOfPath('/')).toBe('en');
		expect(langOfPath('/app/')).toBe('en');
		expect(langOfPath('/404')).toBe('en');
	});

	it('is not fooled by a language code inside a longer segment', () => {
		expect(langOfPath('/app/pl/lemma?l=entheca')).toBe('pl');
		expect(langOfPath('/plaza/pl-route')).toBe('en');
	});
});

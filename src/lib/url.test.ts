import { describe, expect, it } from 'vitest';
import { langOfPath } from './url';

describe('langOfPath', () => {
	it('reads the language by segment, not by substring', () => {
		// '/app/en/lemma/plenus'.includes('/pl') is true — the defect this
		// function replaced answered Polish to English readers on every lemma
		// beginning pl- (plenus, plebs, placeat).
		expect(langOfPath('/app/en/lemma/plenus')).toBe('en');
		expect(langOfPath('/app/en/lemma/plebs')).toBe('en');
		expect(langOfPath('/app/en/lemma/placeat')).toBe('en');
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
		expect(langOfPath('/app/pl/lemma/entheca')).toBe('pl');
		expect(langOfPath('/plaza/pl-route')).toBe('en');
	});
});

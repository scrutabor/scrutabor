import { describe, expect, it } from 'vitest';
import { bindOrphans, bindProse, findOrphans } from './polish';

const NB = ' ';

describe('binding one-letter words', () => {
	it('binds every one-letter conjunction and preposition', () => {
		for (const w of ['a', 'i', 'o', 'u', 'w', 'z']) {
			expect(bindOrphans(`tekst ${w} tekst`)).toBe(`tekst ${w}${NB}tekst`);
		}
	});

	it('binds them capitalized, as a sentence opens', () => {
		expect(bindOrphans('W kościele')).toBe(`W${NB}kościele`);
		expect(bindOrphans('Zdanie. I dalej')).toBe(`Zdanie. I${NB}dalej`);
	});

	it('binds a run of them', () => {
		expect(bindOrphans('mówi o i za nas')).toBe(`mówi o${NB}i${NB}za nas`);
	});

	it('binds after an opening quote or bracket', () => {
		expect(bindOrphans('„w imię”')).toBe(`„w${NB}imię”`);
		expect(bindOrphans('(z Ewangelii)')).toBe(`(z${NB}Ewangelii)`);
	});

	it('leaves longer words alone — the rule is one letter', () => {
		expect(bindOrphans('do ołtarza po Mszy za nas')).toBe('do ołtarza po Mszy za nas');
	});

	it('leaves a letter that is not a word alone', () => {
		expect(bindOrphans('w. 12')).toBe('w. 12'); // abbreviation
		expect(bindOrphans('a) pierwszy')).toBe('a) pierwszy'); // enumeration
		expect(bindOrphans('„a” (w012)')).toBe('„a” (w012)'); // a quoted form
	});

	it('is idempotent', () => {
		const once = bindOrphans('Mszału Rzymskiego z 1962 roku');
		expect(bindOrphans(once)).toBe(once);
		expect(once).toBe(`Mszału Rzymskiego z${NB}1962 roku`);
	});

	it('reports what it would bind, for the guard', () => {
		expect(findOrphans('idzie w pokoju i modli się o to')).toEqual(['w', 'i', 'o']);
		expect(findOrphans(`idzie w${NB}pokoju`)).toEqual([]);
	});

	it('walks nested content', () => {
		expect(
			bindProse({ a: 'w domu', b: ['z nami', 'do domu'], c: { d: 'o tym' }, e: undefined })
		).toEqual({
			a: `w${NB}domu`,
			b: [`z${NB}nami`, 'do domu'],
			c: { d: `o${NB}tym` },
			e: undefined
		});
	});

	it('leaves language-independent citation metadata unchanged', () => {
		const citation = { title: 'A Latin Grammar', locator: 'p. 1' };
		expect(bindProse({ explanation: 'w zdaniu', explanation_citations: [citation] })).toEqual({
			explanation: `w${NB}zdaniu`,
			explanation_citations: [citation]
		});
	});
});

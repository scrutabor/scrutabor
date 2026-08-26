import { describe, expect, it } from 'vitest';
import { loadedTextKeys } from './corpus';
import { normalizeSearch, searchBook } from './search';

describe('book search', () => {
	it('is case-insensitive without changing devotional display capitalization', async () => {
		const pious = 'Duszo Chrystusowa';
		const ordinary = await searchBook(pious, 'pl');
		const capitals = await searchBook(pious.toLocaleUpperCase('pl'), 'pl');
		expect(normalizeSearch(pious)).toBe(normalizeSearch(pious.toLocaleUpperCase('pl')));
		expect(capitals.titles.map(({ textKey }) => textKey)).toEqual(
			ordinary.titles.map(({ textKey }) => textKey)
		);
		expect(ordinary.titles[0]).toMatchObject({
			textKey: 'orationes/anima-christi',
			title: pious,
			latinTitle: 'Ánima Christi'
		});
	});

	it('puts a prayer-title match before the many content occurrences', async () => {
		const results = await searchBook('Pater', 'pl');
		expect(results.titles[0]).toMatchObject({ textKey: 'orationes/pater-noster' });
		expect(results.titles.map(({ textKey }) => textKey)).toEqual(['orationes/pater-noster']);
		expect(results.contents.length).toBeGreaterThan(0);
		expect(results.grammar.length).toBeGreaterThan(0);
		const phrase = await searchBook('Pater noster', 'en');
		expect(phrase.titles[0]?.textKey).toBe('orationes/pater-noster');
		expect(phrase.contents[0]?.textKey).toBe('orationes/pater-noster');
	});

	it('finds localized aliases without diacritics and tolerates one small mistake', async () => {
		const withoutDiacritics = await searchBook('Najswietsza Panno', 'pl');
		const withMistake = await searchBook('Najświętsza Panmo', 'pl');
		expect(withoutDiacritics.titles[0]?.textKey).toBe('orationes/memorare');
		expect(withMistake.titles[0]?.textKey).toBe('orationes/memorare');
		const oneWordMistake = await searchBook('Magnifcat', 'en');
		expect(oneWordMistake.titles[0]?.textKey).toBe('orationes/magnificat');
	});

	it('links a known translation fragment to its exact segment', async () => {
		const before = new Set(loadedTextKeys());
		const results = await searchBook('Uświęć mnie', 'pl');
		const hit = results.contents.find(({ textKey }) => textKey === 'orationes/anima-christi');
		expect(hit).toMatchObject({ segmentId: 's01', source: 'pl' });
		expect(hit?.href).toBe('/app/pl/orationes/anima-christi?s=s01');
		expect(loadedTextKeys()).toContain('orationes/anima-christi');
		expect(loadedTextKeys().filter((key) => !before.has(key)).length).toBeLessThanOrEqual(12);
	});

	it('matches a Latin phrase with typed-out ligatures', async () => {
		const results = await searchBook('Qui es in caelis', 'en');
		expect(results.contents[0]).toMatchObject({
			textKey: 'orationes/pater-noster',
			segmentId: 's01',
			source: 'la'
		});
	});

	it('finds a title by a distinctive Latin word inside it', async () => {
		const results = await searchBook('Caelorum', 'pl');
		expect(results.titles[0]?.textKey).toBe('orationes/ave-regina-caelorum');
	});

	it('keeps grammatical analysis in its own final result group', async () => {
		const results = await searchBook('Patris', 'en');
		expect(results.titles).toEqual([]);
		expect(results.grammar[0]).toMatchObject({ lemma: 'pater', head: 'pater, patris' });
		expect(results.grammar[0].href).toBe('/app/en/lemma/pater');
	});

	it('does not apply fuzzy matching to very short words', async () => {
		const results = await searchBook('Et', 'pl');
		expect(results.contents.length).toBeGreaterThan(0);
		expect(results.grammar.some(({ lemma }) => lemma === 'et')).toBe(true);
	});
});

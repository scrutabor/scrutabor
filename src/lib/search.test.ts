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

	it('marks only the matched Latin word, never its spacing or punctuation', async () => {
		const results = await searchBook('Da', 'pl');
		const parts = results.contents.flatMap((result) => result.parts).filter((part) => part.hit);
		expect(parts.length).toBeGreaterThan(0);
		expect(parts.every((part) => part.text === part.text.trim())).toBe(true);
		expect(parts.some((part) => part.text.toLocaleLowerCase() === 'da')).toBe(true);
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

describe('accented-ligature spellings', () => {
	// The doxology and the collects, by the spellings a reader actually
	// types. Before the shared-normalizer fix every one of these returned
	// nothing: the index keyed sǽcula as "sæcula" and quǽsumus as
	// "quæsumus", spellings no keyboard produces.
	it('finds saecula, quaesumus and iudaei as typed, at full strength', async () => {
		for (const [query, expectText] of [
			['Saecula', 'orationes/gloria-patri'],
			['Quaesumus', 'orationes/te-deum'],
			['Iudaei', 'proprium/dominica-iii-adventus-evangelium']
		] as const) {
			const results = await searchBook(query, 'pl');
			expect(results.contents.length, query).toBeGreaterThan(0);
			expect(
				results.contents.map(({ textKey }) => textKey),
				query
			).toContain(expectText);
		}
	});

	it('reads the accented source spelling itself the same way', async () => {
		const typed = await searchBook('saecula saeculorum', 'en');
		const pasted = await searchBook('sǽcula sæculórum', 'en');
		expect(typed.contents.length).toBeGreaterThan(0);
		expect(pasted.contents.map(({ textKey }) => textKey)).toEqual(
			typed.contents.map(({ textKey }) => textKey)
		);
	});
});

describe('bounded work', () => {
	it('a pasted or shared oversized query costs what its first page costs', async () => {
		// 20,000 tokens froze the tab for ~6 s and allocated over a gigabyte
		// before the bound existed; ?q= is searched on mount, so a shared
		// link did this to whoever opened it.
		const spam = Array.from({ length: 20000 }, (_, i) => `verbum${i}`).join(' ');
		const started = performance.now();
		const results = await searchBook(spam, 'pl');
		expect(performance.now() - started).toBeLessThan(2000);
		const bounded = await searchBook(spam.slice(0, 120), 'pl');
		expect(results.contents).toEqual(bounded.contents);
		expect(results.titles).toEqual(bounded.titles);
	});

	it('an ordinary query is far below the bound', () => {
		expect('In saecula saeculorum Amen'.length).toBeLessThan(120);
	});
});

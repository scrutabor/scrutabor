import { describe, expect, it } from 'vitest';
import { LEXICON } from './corpus';
import { allLemmaSlugs, lemmaOfSlug, lemmaSlug } from './lemma-slug';

describe('lemma addresses', () => {
	it('are collision-free on a case-insensitive disk, by construction', () => {
		const slugs = allLemmaSlugs();
		const folded = slugs.map((slug) => slug.toLocaleLowerCase('la'));
		expect(new Set(folded).size, 'two emitted pages would share one file name').toBe(slugs.length);
	});

	it('cover the lexicon exactly, both ways', () => {
		const lemmata = Object.keys(LEXICON.lemmata);
		expect(allLemmaSlugs()).toHaveLength(lemmata.length);
		for (const lemma of lemmata) {
			expect(lemmaOfSlug(lemmaSlug(lemma)), lemma).toBe(lemma);
		}
	});

	it('keeps every case-unique lemma at its old address', () => {
		expect(lemmaSlug('misereor')).toBe('misereor');
		expect(lemmaSlug('Maria')).toBe('Maria');
	});

	it('gives a collision group deterministic ordinals by codepoint order', () => {
		// The general rule, exercised on the one real group: the capital
		// sorts before the minuscule, so the saint is .1 and the adjective .2.
		expect(lemmaSlug('Clemens')).toBe('clemens.1');
		expect(lemmaSlug('clemens')).toBe('clemens.2');
		expect(lemmaOfSlug('clemens.1')).toBe('Clemens');
		expect(lemmaOfSlug('clemens.2')).toBe('clemens');
		expect(lemmaOfSlug('clemens'), 'the bare colliding form names nobody').toBeUndefined();
	});

	it('answers a stranger with undefined, not a guess', () => {
		expect(lemmaOfSlug('nonsense')).toBeUndefined();
		expect(lemmaOfSlug('clemens.3')).toBeUndefined();
	});
});

import { describe, expect, it } from 'vitest';
import { describeLemma, describeLemmaGender, describeMorph } from './morph';
import type { LemmaEntry } from './corpus';
import heads from './data/lexicon/heads.json';

const entries = heads.entries as Record<string, LemmaEntry>;
const alternatives = {
	Bethlehem: 'n. / f.',
	Ierosolyma: 'n. / f.',
	advena: 'm. / f.',
	coniunx: 'f. / m.',
	dies: 'm. / f.',
	exsul: 'm. / f.',
	ficus: 'f. / m.',
	infans: 'f. / m.',
	locus: 'm. / n.',
	martyr: 'm. / f.',
	parens: 'm. / f.',
	pascha: 'n. / f.',
	praeses: 'm. / f.',
	princeps: 'm. / f.',
	virgo: 'f. / m.'
};

describe('dictionary gender alternatives', () => {
	it('covers every stored alternative, without inventing one', () => {
		expect(
			Object.keys(entries)
				.filter((key) => entries[key].gender_alt)
				.sort()
		).toEqual(Object.keys(alternatives).sort());
	});

	it.each(Object.entries(alternatives))('%s retains its two genders', (lemma, expected) => {
		expect(describeLemmaGender(entries[lemma])).toBe(expected);
	});

	it('keeps single, absent and repeated values distinct', () => {
		expect(describeLemmaGender(entries.panis)).toBe('m.');
		expect(describeLemmaGender(entries.sum)).toBe('');
		expect(describeLemmaGender(undefined)).toBe('');
		expect(describeLemmaGender({ gender: 'm', gender_alt: 'm' })).toBe('m.');
		expect(describeLemmaGender({ gender_alt: 'f' })).toBe('f.');
		expect(describeLemmaGender({ gender: 'unrecognized' })).toBe('unrecognized');
	});

	it('does not broaden an inflected word into all dictionary alternatives', () => {
		expect(
			describeMorph({ pos: 'noun', case: 'nom', number: 'pl', gender: 'm', decl: 3 }, 'en')
		).toBe('noun — nominative, plural, masculine, 3rd\u00a0declension');
	});
});

describe('dictionary declension alternatives', () => {
	it('covers both stored alternative paradigms', () => {
		expect(
			Object.keys(entries)
				.filter((key) => entries[key].decl_alt)
				.sort()
		).toEqual(['ficus', 'pascha']);
	});

	it.each([
		['ficus', 'pl', 'rzeczownik, deklinacja\u00a0II / deklinacja\u00a0IV'],
		['ficus', 'en', 'noun, 2nd\u00a0declension / 4th\u00a0declension'],
		['pascha', 'pl', 'rzeczownik, deklinacja\u00a0III / deklinacja\u00a0I'],
		['pascha', 'en', 'noun, 3rd\u00a0declension / 1st\u00a0declension']
	] as const)('%s keeps both paradigms in %s', (lemma, lang, expected) => {
		expect(describeLemma(entries[lemma], lang)).toBe(expected);
	});

	it('keeps one paradigm, no paradigm and unknown numbering legible', () => {
		expect(describeLemma(entries.panis, 'en')).toBe('noun, 3rd\u00a0declension');
		expect(describeLemma({ pos: 'noun', decl: 2, decl_alt: 2 }, 'en')).toBe(
			'noun, 2nd\u00a0declension'
		);
		expect(describeLemma({ pos: 'noun', decl_alt: 4 }, 'en')).toBe('noun, 4th\u00a0declension');
		expect(describeLemma({ pos: 'noun', decl: 6 }, 'en')).toBe('noun, 6th\u00a0declension');
		expect(describeLemma({ pos: 'intj' }, 'pl')).toBe('wykrzyknik (nieodmienny)');
		expect(describeLemma({ pos: 'verb', conj: 1 }, 'en')).toBe('verb, 1st\u00a0conjugation');
	});
});

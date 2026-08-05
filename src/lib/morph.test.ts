import { describe, expect, it } from 'vitest';
import { GENDER_MARK, describeLemma, describeMorph, describeMorphParts } from './morph';
import type { Morph } from './corpus';

describe('describeMorph', () => {
	it('renders a noun parse in both languages', () => {
		const mater = { pos: 'noun', case: 'voc', number: 'sg', gender: 'f', decl: 3 };
		expect(describeMorph(mater, 'pl')).toBe(
			'rzeczownik — wołacz, l. poj., r. żeński, deklinacja III'
		);
		expect(describeMorph(mater, 'en')).toBe('noun — vocative, singular, feminine, 3rd declension');
	});

	it('renders a deponent verb with the terminology-contract description', () => {
		const confiteor = {
			pos: 'verb',
			person: 1,
			number: 'sg',
			tense: 'pres',
			mood: 'ind',
			voice: 'dep',
			conj: 2
		};
		expect(describeMorph(confiteor, 'pl')).toBe(
			'czasownik — 1. os., l. poj., czas teraźniejszy, tryb oznajmujący, deponens (forma bierna, znaczenie czynne), koniugacja II'
		);
		expect(describeMorph(confiteor, 'en')).toBe(
			'verb — 1st person, singular, present, indicative, deponent (passive form, active meaning), 2nd conjugation'
		);
	});

	it('renders prepositions with the governed case', () => {
		// the one-letter preposition is bound to what follows it (lib/polish):
		// this label is computed, so the message table's binding never sees it
		expect(describeMorph({ pos: 'prep', governs: 'abl' }, 'pl')).toBe(
			'przyimek (z\u00a0ablativem)'
		);
		expect(describeMorph({ pos: 'prep', governs: 'acc' }, 'pl')).toBe(
			'przyimek (z\u00a0biernikiem)'
		);
		expect(describeMorph({ pos: 'prep', governs: 'acc' }, 'en')).toBe(
			'preposition (with the accusative)'
		);
	});

	it('labels every indeclinable part of speech (the Amen regression)', () => {
		expect(describeMorph({ pos: 'intj' }, 'pl')).toBe('wykrzyknik (nieodmienny)');
		expect(describeMorph({ pos: 'intj' }, 'en')).toBe('interjection (indeclinable)');
		expect(describeMorph({ pos: 'adv' }, 'pl')).toBe('przysłówek');
		expect(describeMorph({ pos: 'conj' }, 'en')).toBe('conjunction');
	});
});

describe('describeMorphParts concept links', () => {
	it('links cases to their grammar-concept pages', () => {
		const parts = describeMorphParts({ pos: 'noun', case: 'voc', number: 'sg' }, 'pl');
		const caseLink = parts.find((p) => p.concept);
		expect(caseLink).toMatchObject({ text: 'wołacz', concept: 'vocativus' });
	});

	it('links the subjunctive, imperative and deponent', () => {
		const subj = describeMorphParts({ pos: 'verb', mood: 'subj' }, 'en');
		expect(subj.some((p) => p.concept === 'coniunctivus')).toBe(true);
		const imp = describeMorphParts({ pos: 'verb', mood: 'imp' }, 'en');
		expect(imp.some((p) => p.concept === 'imperativus')).toBe(true);
		const dep = describeMorphParts({ pos: 'verb', voice: 'dep' }, 'en');
		expect(dep.some((p) => p.concept === 'deponens')).toBe(true);
	});

	it('never links moods and voices without a concept page', () => {
		const ind = describeMorphParts({ pos: 'verb', mood: 'ind', voice: 'act' }, 'pl');
		expect(ind.every((p) => p.concept === undefined)).toBe(true);
	});
});

describe('describeLemma', () => {
	it('renders lemma-level paradigm facts', () => {
		expect(describeLemma({ pos: 'verb', conj: 1 }, 'pl')).toBe('czasownik, koniugacja I');
		expect(describeLemma({ pos: 'noun', decl: 4 }, 'en')).toBe('noun, 4th declension');
		expect(describeLemma({ pos: 'intj' }, 'en')).toBe('interjection (indeclinable)');
	});
});

describe('GENDER_MARK', () => {
	it('uses the international dictionary abbreviations', () => {
		expect(GENDER_MARK).toEqual({ m: 'm.', f: 'f.', n: 'n.' });
	});
});

describe('participles', () => {
	const natum = {
		pos: 'verb',
		mood: 'part',
		tense: 'perf',
		voice: 'pass',
		case: 'acc',
		number: 'sg',
		gender: 'm',
		conj: 3
	};

	it('reads as a verbal adjective in both languages', () => {
		expect(describeMorph(natum, 'pl')).toBe(
			'czasownik — imiesłów, perfectum, strona bierna, biernik, l. poj., r. męski, koniugacja III'
		);
		expect(describeMorph(natum, 'en')).toBe(
			'verb — participle, perfect, passive, accusative, singular, masculine, 3rd conjugation'
		);
	});

	it('links the case concept and keeps the deponent concept', () => {
		const parts = describeMorphParts({ ...natum, voice: 'dep' }, 'pl');
		expect(parts.some((p) => p.concept === 'accusativus')).toBe(true);
		expect(parts.some((p) => p.concept === 'deponens')).toBe(true);
	});
});

describe('a verb whose form does not settle its tense or mood', () => {
	// retríbuam (quid-retribuam w002): both analyzers allow future
	// indicative and present subjunctive, and nothing in the sentence
	// decides. The corpus claims what it knows and stops.
	const retribuam: Morph = {
		pos: 'verb',
		person: 1,
		number: 'sg',
		voice: 'act',
		conj: 3
	};

	// The marker stands where the tense and mood would have stood.
	it('says so, rather than leaving the line looking unfinished', () => {
		expect(describeMorph(retribuam, 'pl')).toBe(
			'czasownik — 1. os., l. poj., forma niejednoznaczna, strona czynna, koniugacja III'
		);
		expect(describeMorph(retribuam, 'en')).toBe(
			'verb — 1st person, singular, the form does not decide, active, 3rd conjugation'
		);
	});

	it('stays silent when the tense is known', () => {
		const known = { ...retribuam, tense: 'perf' as const, mood: 'ind' as const };
		expect(describeMorph(known, 'pl')).not.toContain('niejednoznaczna');
	});
});

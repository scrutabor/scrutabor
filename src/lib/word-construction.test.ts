import { describe, expect, it } from 'vitest';
import type { Analysis, GlossDocument, Morph, TextDocument, Word } from './corpus';
import {
	constructionForWord,
	describeConstruction,
	type ConstructionParticipleKind
} from './word-construction';

const analysis: Analysis = { confidence: 'high', review: 'accepted', sources: ['editorial'] };

function word(id: string, form: string, lemma: string, morph: Morph): Word {
	return { id, form, lemma, morph };
}

function fixture(
	words: Word[],
	gloss: string,
	forms = words.map((item) => item.form)
): { doc: TextDocument; gloss: GlossDocument } {
	const alignment = { words: words.map((item) => item.id), forms, anchor: words.at(-1)!.id, gloss };
	return {
		doc: {
			schema_version: 'test',
			id: 'test',
			title: 'Test',
			status: 'reviewed',
			analysis_defaults: analysis,
			segments: [{ id: 's01', type: 'verse', words }]
		},
		gloss: {
			schema_version: 'test',
			text: 'test',
			lang: 'pl',
			status: 'reviewed',
			analysis_defaults: analysis,
			segments: { s01: { alignments: [alignment] } },
			words: Object.fromEntries(words.map((item) => [item.id, { alignment }]))
		}
	};
}

describe('shared word constructions', () => {
	it.each<{
		name: string;
		morph: Morph;
		kind: ConstructionParticipleKind;
	}>([
		{
			name: 'future active',
			morph: { pos: 'verb', mood: 'part', tense: 'fut', voice: 'act' },
			kind: 'future-active'
		},
		{
			name: 'perfect passive',
			morph: { pos: 'verb', mood: 'part', tense: 'perf', voice: 'pass' },
			kind: 'perfect-passive'
		},
		{
			name: 'perfect deponent',
			morph: { pos: 'verb', mood: 'part', tense: 'perf', voice: 'dep' },
			kind: 'perfect-deponent'
		},
		{
			name: 'future passive',
			morph: { pos: 'verb', mood: 'part', tense: 'fut', voice: 'pass' },
			kind: 'future-passive'
		},
		{
			name: 'present active',
			morph: { pos: 'verb', mood: 'part', tense: 'pres', voice: 'act' },
			kind: 'present-active'
		}
	])('recognizes a $name participle with an auxiliary', ({ morph, kind }) => {
		const { doc, gloss } = fixture(
			[
				word('w001', 'est', 'sum', {
					pos: 'verb',
					mood: 'ind',
					tense: 'pres',
					voice: 'act'
				}),
				word('w002', 'factum', 'facio', morph)
			],
			'będzie'
		);
		const construction = constructionForWord(doc, gloss, 'w002');

		expect(construction?.grammar).toEqual({
			kind: 'auxiliary-participle',
			auxiliaryId: 'w001',
			participleId: 'w002',
			participleKind: kind
		});
	});

	it('resolves the same complete construction from either constituent word', () => {
		const { doc, gloss } = fixture(
			[
				word('w015', 'est', 'sum', {
					pos: 'verb',
					mood: 'ind',
					tense: 'pres',
					voice: 'act'
				}),
				word('w016', 'futúrus', 'sum', {
					pos: 'verb',
					mood: 'part',
					tense: 'fut',
					voice: 'act'
				})
			],
			'będzie'
		);

		const fromAuxiliary = constructionForWord(doc, gloss, 'w015');
		const fromParticiple = constructionForWord(doc, gloss, 'w016');
		expect(fromAuxiliary).toEqual(fromParticiple);
		expect(fromAuxiliary?.parts.map((part) => part.word.id)).toEqual(['w015', 'w016']);
		expect(describeConstruction(fromAuxiliary!, 'pl').replaceAll('\u00a0', ' ')).toBe(
			'Est pełni tu funkcję czasownika posiłkowego, a futúrus jest imiesłowem czasu przyszłego. Całe wyrażenie oddajemy po polsku jako „będzie”.'
		);
		expect(describeConstruction(fromAuxiliary!, 'en')).toBe(
			'Est functions here as an auxiliary verb, while futúrus is a future active participle. The whole expression is rendered in English as “będzie”.'
		);
	});

	it('describes a non-periphrastic group without inventing a grammatical relationship', () => {
		const { doc, gloss } = fixture(
			[
				word('w001', 'Salvum', 'salvus', { pos: 'adj' }),
				word('w002', 'fac', 'facio', { pos: 'verb', mood: 'imp', voice: 'act' })
			],
			'ocal'
		);
		const construction = constructionForWord(doc, gloss, 'w001')!;

		expect(construction.grammar).toEqual({ kind: 'shared-expression' });
		expect(describeConstruction(construction, 'pl').replaceAll('\u00a0', ' ')).toBe(
			'Wyrazy „Salvum fac” tworzą tu jedną całość znaczeniową, oddaną w przekładzie słowo po słowie jako „ocal”.'
		);
	});

	it('leaves ordinary and zero-realization alignments as single-word panels', () => {
		const only = word('w001', 'et', 'et', { pos: 'conj' });
		const { doc, gloss } = fixture([only], 'i');
		expect(constructionForWord(doc, gloss, only.id)).toBeNull();

		gloss.words[only.id] = {
			alignment: { words: [only.id, 'w002'], forms: ['et', 'autem'], reason: 'word-order' }
		};
		expect(constructionForWord(doc, gloss, only.id)).toBeNull();
	});
});

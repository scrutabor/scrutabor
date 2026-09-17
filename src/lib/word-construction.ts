import type { Analysis, GlossDocument, TextDocument, Word, WordGloss } from './corpus';
import { M, type Lang } from './i18n';

export type ConstructionParticipleKind =
	'future-active' | 'perfect-passive' | 'perfect-deponent' | 'future-passive' | 'present-active';

export interface WordConstructionPart {
	word: Word;
	gloss: WordGloss;
	analysis: Analysis;
}

export interface AuxiliaryParticipleConstruction {
	kind: 'auxiliary-participle';
	auxiliaryId: string;
	participleId: string;
	participleKind: ConstructionParticipleKind;
}

export interface SharedExpressionConstruction {
	kind: 'shared-expression';
}

export interface WordConstruction {
	parts: WordConstructionPart[];
	gloss: string;
	grammar: AuxiliaryParticipleConstruction | SharedExpressionConstruction;
}

function participleKind(word: Word): ConstructionParticipleKind | null {
	if (word.morph.mood !== 'part') return null;
	const key = `${word.morph.tense ?? ''}:${word.morph.voice ?? ''}`;
	const kinds: Record<string, ConstructionParticipleKind> = {
		'fut:act': 'future-active',
		'perf:pass': 'perfect-passive',
		'perf:dep': 'perfect-deponent',
		'fut:pass': 'future-passive',
		'pres:act': 'present-active'
	};
	return kinds[key] ?? null;
}

function grammarOf(parts: WordConstructionPart[]): WordConstruction['grammar'] {
	if (parts.length !== 2) return { kind: 'shared-expression' };
	const auxiliary = parts.find(
		(part) =>
			part.word.lemma === 'sum' && part.word.morph.pos === 'verb' && part.word.morph.mood !== 'part'
	);
	const participle = parts.find((part) => part.word.morph.mood === 'part');
	const kind = participle && participleKind(participle.word);
	if (!auxiliary || !participle || !kind) return { kind: 'shared-expression' };
	return {
		kind: 'auxiliary-participle',
		auxiliaryId: auxiliary.word.id,
		participleId: participle.word.id,
		participleKind: kind
	};
}

function sentenceInitial(value: string): string {
	return value.length ? value[0].toLocaleUpperCase() + value.slice(1) : value;
}

/**
 * Resolve the many-to-one alignment containing a selected word. Ordinary
 * words and zero-realization alignments deliberately return null: only a
 * shared reader-visible gloss represents one expression that should open as
 * one target while preserving the analysis of every Latin word inside it.
 */
export function constructionForWord(
	doc: TextDocument,
	gloss: GlossDocument,
	wordId: string
): WordConstruction | null {
	const segment = doc.segments.find((candidate) =>
		candidate.words?.some((word) => word.id === wordId)
	);
	if (!segment?.words) return null;
	const alignment = gloss.words[wordId]?.alignment;
	if (!alignment?.gloss || alignment.words.length < 2) return null;

	const words = new Map(segment.words.map((word) => [word.id, word] as const));
	const parts = alignment.words.flatMap((id): WordConstructionPart[] => {
		const word = words.get(id);
		if (!word) return [];
		return [
			{
				word,
				gloss: gloss.words[id] ?? {},
				analysis: word.analysis ?? doc.analysis_defaults_words ?? doc.analysis_defaults
			}
		];
	});
	if (parts.length !== alignment.words.length) return null;
	return { parts, gloss: alignment.gloss, grammar: grammarOf(parts) };
}

export function describeConstruction(construction: WordConstruction, lang: Lang): string {
	if (construction.grammar.kind === 'auxiliary-participle') {
		const grammar = construction.grammar;
		const auxiliary = construction.parts.find((part) => part.word.id === grammar.auxiliaryId);
		const participle = construction.parts.find((part) => part.word.id === grammar.participleId);
		if (auxiliary && participle)
			return M[lang].auxiliaryParticipleConstruction(
				sentenceInitial(auxiliary.word.form),
				participle.word.form,
				M[lang].constructionParticiple[grammar.participleKind],
				construction.gloss
			);
	}
	return M[lang].sharedConstruction(
		construction.parts.map((part) => part.word.form).join(' '),
		construction.gloss
	);
}

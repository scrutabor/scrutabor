/** Structural prerequisites shared by localized text and word-card consumers. */
import { hasText } from './corpus-metadata';
import type { Lang } from './i18n';

export function object(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function usableLemma(value: unknown): boolean {
	return object(value) && nonempty(value.head) && nonempty(value.pos);
}

function usableSenses(value: unknown): boolean {
	return (
		object(value) &&
		Array.isArray(value.senses) &&
		value.senses.length > 0 &&
		value.senses.every(nonempty)
	);
}

function sameAlignment(left: unknown, right: Record<string, unknown>): boolean {
	if (!object(left)) return false;
	return ['words', 'forms', 'anchor', 'gloss', 'reason'].every(
		(field) => JSON.stringify(left[field]) === JSON.stringify(right[field])
	);
}

function localizedVerse(
	words: Record<string, unknown>[],
	segment: Record<string, unknown>,
	gloss: Record<string, unknown>
) {
	if (!nonempty(segment.translation)) throw new Error('missing text translation');
	const alignments = segment.alignments ?? [];
	if (!Array.isArray(alignments)) throw new Error('invalid text alignments');
	const members = new Set<string>();
	for (const alignment of alignments) {
		if (
			!object(alignment) ||
			!Array.isArray(alignment.words) ||
			!Array.isArray(alignment.forms) ||
			!alignment.words.length ||
			alignment.words.length !== alignment.forms.length
		)
			throw new Error('invalid text alignment');
		const ids = alignment.words;
		const forms = alignment.forms;
		const start = words.findIndex((word) => word.id === ids[0]);
		if (
			start < 0 ||
			ids.some(
				(id, index) =>
					!nonempty(id) ||
					members.has(id) ||
					words[start + index]?.id !== id ||
					words[start + index]?.form !== forms[index]
			)
		)
			throw new Error('invalid text alignment members');
		if (ids.length === 1) {
			if (
				typeof alignment.reason !== 'string' ||
				!['idiom', 'inflection', 'punctuation', 'word-order'].includes(alignment.reason) ||
				alignment.gloss !== undefined
			)
				throw new Error('invalid text zero alignment');
		} else if (!nonempty(alignment.gloss) || !ids.includes(alignment.anchor)) {
			throw new Error('invalid text shared gloss');
		}
		for (const id of ids) {
			if (
				!object(gloss[id]) ||
				!sameAlignment(gloss[id].alignment, alignment) ||
				gloss[id].gloss !== undefined
			)
				throw new Error('incomplete text alignment realization');
			members.add(id);
		}
	}
	for (const word of words) {
		const id = String(word.id);
		if (
			!members.has(id) &&
			(!object(gloss[id]) || !nonempty(gloss[id].gloss) || gloss[id].alignment !== undefined)
		)
			throw new Error('missing text word gloss');
	}
}

/** Per-text identities are unique; repeated occurrences in a Mass remain valid. */
export function validateLocalizedBody(part: unknown, lang: Lang, lex: unknown): void {
	if (
		!object(part) ||
		!nonempty(part.key) ||
		!hasText(part.key, lang) ||
		!object(lex) ||
		!object(lex.lemmata) ||
		!object(lex.senses)
	)
		throw new Error('invalid localized text');
	if (
		!object(part.doc) ||
		part.doc.id !== part.key.replace('/', '.') ||
		!Array.isArray(part.doc.segments) ||
		!part.doc.segments.length ||
		!object(part.gloss) ||
		part.gloss.text !== part.doc.id ||
		part.gloss.lang !== lang ||
		!object(part.gloss.segments) ||
		!object(part.gloss.words) ||
		!object(part.bibliography) ||
		!Array.isArray(part.bibliography.context) ||
		!Array.isArray(part.bibliography.translation)
	)
		throw new Error('invalid localized body data');
	let count = 0;
	const segmentIds = new Set<string>();
	const wordIds = new Set<string>();
	for (const segment of part.doc.segments) {
		if (
			!object(segment) ||
			!nonempty(segment.id) ||
			segmentIds.has(segment.id) ||
			(segment.type !== 'verse' && segment.type !== 'rubric') ||
			!object(part.gloss.segments[segment.id])
		)
			throw new Error('incomplete text segments');
		segmentIds.add(segment.id);
		const localized = part.gloss.segments[segment.id] as Record<string, unknown>;
		if (segment.type === 'rubric' && (!nonempty(segment.text) || !nonempty(localized.narrative)))
			throw new Error('incomplete text rubric');
		if (segment.type === 'verse') {
			if (!Array.isArray(segment.words) || !segment.words.length)
				throw new Error('empty text verse');
			for (const word of segment.words) {
				if (
					!object(word) ||
					!nonempty(word.id) ||
					wordIds.has(word.id) ||
					!nonempty(word.form) ||
					!nonempty(word.lemma) ||
					!usableLemma(lex.lemmata[word.lemma]) ||
					!usableSenses(lex.senses[word.lemma]) ||
					!object(word.morph) ||
					!nonempty(word.morph.pos) ||
					!object(part.gloss.words[word.id])
				)
					throw new Error('incomplete text lexical data');
				wordIds.add(word.id);
				count += 1;
			}
			localizedVerse(segment.words as Record<string, unknown>[], localized, part.gloss.words);
		}
	}
	if (!count) throw new Error('empty localized body');
}

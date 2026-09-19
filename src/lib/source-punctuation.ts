import type { Segment, Word } from './corpus';

export interface SourceFace {
	word: Word;
	prefix: string;
	suffix: string;
}

/** Project source punctuation without changing lexical forms, posts or IDs.
 * Windows are half-open word positions, never numeric interpretations of IDs.
 * An excerpt includes every intersecting pair in full. Optional atomic groups
 * keep an interlinear construction complete when widening reaches into it. */
export function sourceWindow(
	segment: Segment,
	start = 0,
	end = segment.words?.length ?? 0,
	groups: readonly (readonly string[])[] = []
) {
	const words = segment.words ?? [];
	start = Math.max(0, Math.min(words.length, start));
	end = Math.max(start, Math.min(words.length, end));
	const positions = new Map(words.map((word, index) => [word.id, index]));
	const bounds = (from: string, through: string): [number, number] => {
		const first = positions.get(from);
		const last = positions.get(through);
		if (first === undefined || last === undefined || first > last)
			throw new Error(`${segment.id}: invalid source range ${from}–${through}`);
		return [first, last + 1];
	};
	const pairs = (segment.parentheses ?? []).map((range) => ({
		...range,
		bounds: bounds(range.from, range.through)
	}));
	const intervals = [
		...pairs.map((pair) => pair.bounds),
		...groups.filter((group) => group.length).map((group) => bounds(group[0], group.at(-1)!))
	];
	if (start < end) {
		let changed: boolean;
		do {
			changed = false;
			for (const [first, stop] of intervals) {
				if (first < end && stop > start && (first < start || stop > end)) {
					start = Math.min(start, first);
					end = Math.max(end, stop);
					changed = true;
				}
			}
		} while (changed);
	}
	const opening = new Set(pairs.map((pair) => pair.from));
	const closing = new Map(pairs.map((pair) => [pair.through, pair.closing]));
	const faces: SourceFace[] = words.slice(start, end).map((word) => {
		const post = word.post ?? '';
		return {
			word,
			prefix: opening.has(word.id) ? '(' : '',
			suffix: closing.has(word.id)
				? closing.get(word.id) === 'after-post'
					? `${post})`
					: `)${post}`
				: post
		};
	});
	return { faces, start, end, before: start > 0, after: end < words.length };
}

export function sourceFaceText(face: SourceFace): string {
	return `${face.prefix}${face.word.form}${face.suffix}`;
}

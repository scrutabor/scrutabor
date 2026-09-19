import { textAnchor } from './text-anchor';
import type { Word } from './corpus';

/** Keep each word attached to the exact displayed occurrence and its data. */
export function indexOccurrenceWords<
	T extends { slug: string; doc: { segments: { words?: Word[] }[] } }
>(parts: T[]) {
	const words = new Map<string, T & { word: Word }>();
	for (const part of parts) {
		for (const segment of part.doc.segments) {
			for (const word of segment.words ?? []) {
				words.set(`${part.slug}.${word.id}`, { ...part, word });
			}
		}
	}
	return words;
}

/** A text may be prayed twice in one Mass. Corpus identity stays shared;
 * reader addresses distinguish its occurrences. The first retains the plain
 * text address used by concordance links, later ones name their liturgical part. */
export function properOccurrences<T extends { key: string; part: string }>(parts: T[]) {
	const seen = new Set<string>();
	return parts.map((part) => {
		const suffix = seen.has(part.key) ? `~${part.part}` : '';
		seen.add(part.key);
		return {
			...part,
			slug: `${part.key.split('/')[1]}${suffix}`,
			anchor: `${textAnchor(part.key)}${suffix}`
		};
	});
}

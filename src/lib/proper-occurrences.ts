import { textAnchor } from './text-anchor';

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

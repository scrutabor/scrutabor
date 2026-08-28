const RANGE_SEPARATOR = '-';

export function segmentRange(ids: string[], anchor: string, target: string): string[] {
	const a = ids.indexOf(anchor);
	const b = ids.indexOf(target);
	if (a < 0 || b < 0) return [];
	return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/** Resolve a shared address to live segments. A retired id — a verse later
 * merged away — resolves to the surviving segment the edition names for it,
 * so an old link degrades to its content's new home instead of to nothing. */
export function parseSegmentSelection(
	raw: string | null,
	ids: string[],
	retired: Record<string, string> = {}
): string[] {
	if (!raw) return [];
	const resolve = (token: string): string | undefined => {
		if (ids.includes(token)) return token;
		const seen = new Set<string>();
		let current = token;
		while (retired[current]) {
			if (seen.has(current)) return undefined;
			seen.add(current);
			current = retired[current];
			if (ids.includes(current)) return current;
		}
		return undefined;
	};
	const single = resolve(raw);
	if (single) return [single];
	const endpoints = raw.split(RANGE_SEPARATOR);
	if (endpoints.length !== 2) return [];
	const [from, to] = [resolve(endpoints[0]), resolve(endpoints[1])];
	if (!from || !to) return [];
	return segmentRange(ids, from, to);
}

export function resolveWordAddress(
	raw: string | null,
	wordIds: string[],
	segmentIds: string[],
	retiredWords: Record<string, string> = {},
	retiredSegments: Record<string, string> = {}
): { word?: string; segment?: string } | null {
	if (!raw) return null;
	if (wordIds.includes(raw)) return { word: raw };
	const anchor = retiredWords[raw];
	if (!anchor) return null;
	const [segment] = parseSegmentSelection(anchor, segmentIds, retiredSegments);
	return segment ? { segment } : null;
}

export function formatSegmentSelection(selected: string[], ids: string[]): string | null {
	const chosen = new Set(selected);
	const ordered = ids.filter((id) => chosen.has(id));
	if (ordered.length === 0) return null;
	if (ordered.length === 1) return ordered[0];
	return `${ordered[0]}${RANGE_SEPARATOR}${ordered.at(-1)}`;
}

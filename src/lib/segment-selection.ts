const RANGE_SEPARATOR = '-';

export function segmentRange(ids: string[], anchor: string, target: string): string[] {
	const a = ids.indexOf(anchor);
	const b = ids.indexOf(target);
	if (a < 0 || b < 0) return [];
	return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
}

export function parseSegmentSelection(raw: string | null, ids: string[]): string[] {
	if (!raw) return [];
	if (ids.includes(raw)) return [raw];
	const endpoints = raw.split(RANGE_SEPARATOR);
	if (endpoints.length !== 2 || !endpoints[0] || !endpoints[1]) return [];
	return segmentRange(ids, endpoints[0], endpoints[1]);
}

export function formatSegmentSelection(selected: string[], ids: string[]): string | null {
	const chosen = new Set(selected);
	const ordered = ids.filter((id) => chosen.has(id));
	if (ordered.length === 0) return null;
	if (ordered.length === 1) return ordered[0];
	return `${ordered[0]}${RANGE_SEPARATOR}${ordered.at(-1)}`;
}

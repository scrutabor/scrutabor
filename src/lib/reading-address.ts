import {
	formatSegmentSelection,
	parseSegmentSelection,
	resolveWordAddress
} from './segment-selection';

interface AddressDocument {
	segments: { id: string; words?: { id: string }[] }[];
	retired_words?: Record<string, string>;
	retired_segments?: Record<string, string>;
}

interface AddressPart {
	slug: string;
	anchor: string;
	doc: AddressDocument;
}

/** Update only the citation; date, Mass choice and fragments belong to callers. */
export function writeReadingAddress(
	url: URL,
	resolved: { word: string | null; segment: string | null }
) {
	for (const [key, value] of [
		['w', resolved.word],
		['s', resolved.segment]
	] as const) {
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
	}
}

/** A valid explicit segment citation wins over a retired word's fallback.
 * Live words can still open their panel beside an explicit segment selection. */
export function resolveDocumentAddress(
	doc: AddressDocument,
	word: string | null,
	segment: string | null
) {
	const ids = doc.segments.map((entry) => entry.id);
	const resolved = resolveWordAddress(
		word,
		doc.segments.flatMap((entry) => (entry.words ?? []).map((item) => item.id)),
		ids,
		doc.retired_words,
		doc.retired_segments
	);
	const explicit = parseSegmentSelection(segment, ids, doc.retired_segments);
	const segments = explicit.length ? explicit : resolved?.segment ? [resolved.segment] : [];
	return {
		word: resolved?.word ?? null,
		segment: formatSegmentSelection(segments, ids),
		segments
	};
}

/** Resolve against the displayed occurrence, never a guessed text. Bare ids
 * from old text-page redirects need a known fragment; repeated propers keep
 * their occurrence suffix for both live and retired addresses. */
export function resolveCompositeAddress(
	parts: AddressPart[],
	word: string | null,
	segment: string | null,
	hash: string
) {
	const locate = (raw: string | null) => {
		if (!raw) return null;
		const dot = raw.indexOf('.');
		const part = parts.find((candidate) =>
			dot < 0 ? hash === `#${candidate.anchor}` : candidate.slug === raw.slice(0, dot)
		);
		return part ? { part, selector: dot < 0 ? raw : raw.slice(dot + 1) } : null;
	};
	const cited = locate(segment);
	const pointed = locate(word);
	const explicit = cited && resolveDocumentAddress(cited.part.doc, null, cited.selector);
	const resolved = pointed && resolveDocumentAddress(pointed.part.doc, pointed.selector, null);
	const selection = explicit?.segment ? explicit : resolved;
	const owner = explicit?.segment ? cited : pointed;
	const part = selection?.segment && owner ? owner.part.slug : null;
	return {
		word: resolved?.word && pointed ? `${pointed.part.slug}.${resolved.word}` : null,
		segment: part && selection?.segment ? `${part}.${selection.segment}` : null,
		segments: selection?.segments ?? [],
		part
	};
}

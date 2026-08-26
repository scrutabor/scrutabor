import type { Citation, GlossDocument, Segment, TranslationRelationship } from '$lib/corpus';

export interface LitanyRow {
	/** Index of the invocation or other segment that opens the row. */
	primary: number;
	/** Adjacent response, when this is a leader-and-response row. */
	response?: number;
}

const RESPONSE_SPEAKERS = new Set(['minister', 'populus', 'omnes', 'schola']);
const LEADER_SPEAKERS = new Set(['sacerdos', 'ductor']);

const hasSpeaker = (segment: Segment, speakers: Set<string>) =>
	segment.type === 'verse' && segment.speaker !== undefined && speakers.has(segment.speaker);

/**
 * Pair each adjacent litany invocation and response without changing either
 * segment. Unattributed openings, rubrics, and unpaired verses keep a full row.
 * The exact response remains visible, so singular, plural, and longer formulas
 * can share one compact prayer-book layout.
 */
export function litanyRows(segments: Segment[]): LitanyRow[] {
	const rows: LitanyRow[] = [];

	for (let primary = 0; primary < segments.length; primary += 1) {
		const response = primary + 1;
		if (
			hasSpeaker(segments[primary], LEADER_SPEAKERS) &&
			response < segments.length &&
			hasSpeaker(segments[response], RESPONSE_SPEAKERS)
		) {
			rows.push({ primary, response });
			primary = response;
		} else {
			rows.push({ primary });
		}
	}

	return rows;
}

/** One prayer-level list, grouped by source while retaining every locator. */
export function collectTranslationCitations(segments: Segment[], gloss: GlossDocument): Citation[] {
	const grouped = new Map<string, { citation: Citation; locators: string[] }>();

	for (const segment of segments) {
		for (const citation of gloss.segments[segment.id]?.translation_citations ?? []) {
			const key = `${citation.title}\u0000${citation.url ?? ''}`;
			const found = grouped.get(key);
			if (!found) {
				grouped.set(key, { citation, locators: [citation.locator] });
			} else if (!found.locators.includes(citation.locator)) {
				found.locators.push(citation.locator);
			}
		}
	}

	return [...grouped.values()].map(({ citation, locators }) => ({
		...citation,
		locator: locators.join('; ')
	}));
}

/** The distinct source relationships used by this text, in reading order. */
export function collectTranslationRelationships(
	segments: Segment[],
	gloss: GlossDocument
): TranslationRelationship[] {
	const found = new Set<TranslationRelationship>();
	for (const segment of segments) {
		const relationship = gloss.segments[segment.id]?.translation_relationship;
		if (relationship) found.add(relationship);
	}
	return [...found];
}

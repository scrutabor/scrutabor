import type { Citation, GlossDocument, Segment } from '$lib/corpus';

export interface RepeatedResponsePlan {
	/** The first response in a compacted series, printed with an ellipsis. */
	continued: string[];
	/** Later responses in that series, omitted from the ordinary reading. */
	omitted: string[];
}

const RESPONSE_SPEAKERS = new Set(['minister', 'populus', 'omnes', 'schola']);
const LEADER_SPEAKERS = new Set(['sacerdos', 'ductor']);

function responseKey(segment: Segment): string | undefined {
	if (
		segment.type !== 'verse' ||
		!segment.speaker ||
		!RESPONSE_SPEAKERS.has(segment.speaker) ||
		!segment.words?.length
	)
		return undefined;

	const text = segment.words.map((word) => `${word.form}${word.post ?? ''}`).join(' ');
	return `${segment.speaker}:${text}`;
}

/**
 * Find long litany response series. A series may be interrupted by the
 * leader's invocations, but a rubric, an unattributed verse, or a different
 * response closes it. Short repetitions remain in full.
 */
export function repeatedResponsePlan(
	segments: Segment[],
	minimumRepetitions = 3
): RepeatedResponsePlan {
	const continued: string[] = [];
	const omitted: string[] = [];
	let key: string | undefined;
	let ids: string[] = [];

	const finish = () => {
		if (ids.length >= minimumRepetitions) {
			continued.push(ids[0]);
			omitted.push(...ids.slice(1));
		}
		key = undefined;
		ids = [];
	};

	for (const segment of segments) {
		const nextKey = responseKey(segment);
		if (nextKey) {
			if (nextKey !== key) {
				finish();
				key = nextKey;
			}
			ids.push(segment.id);
			continue;
		}

		const isInvocation =
			segment.type === 'verse' &&
			segment.speaker !== undefined &&
			LEADER_SPEAKERS.has(segment.speaker);
		if (!isInvocation) finish();
	}
	finish();

	return { continued, omitted };
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

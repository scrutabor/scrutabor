import type { MassForm, Segment } from './corpus';
import { inMassForm } from './speaker-marks';

function object(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function quietPriestlyDelivery(value: unknown): boolean {
	return (
		object(value) &&
		Object.keys(value).length === 1 &&
		object(value.cantu) &&
		Object.keys(value.cantu).length === 1 &&
		value.cantu.voice === 'secreto'
	);
}

/** Validate received metadata, not a second editorial inventory of texts. */
export function validateParticipationPerformance(document: unknown, readerVersion: string): void {
	if (!object(document) || !Array.isArray(document.segments))
		throw new Error('invalid participation performance document');
	for (const segment of document.segments) {
		if (!object(segment)) throw new Error('invalid performance segment');
		if (!object(segment.participation)) continue;
		for (const [form, grant] of Object.entries(segment.participation)) {
			if (!object(grant) || !Object.hasOwn(grant, 'performance')) continue;
			const performance = grant.performance;
			if (
				readerVersion !== '6.7.0' ||
				form !== 'cantu' ||
				segment.type !== 'verse' ||
				segment.speaker !== 'sacerdos' ||
				segment.voice !== 'clara' ||
				!quietPriestlyDelivery(segment.delivery) ||
				grant.gradus !== 2 ||
				grant.source !== 'DMS 25 b' ||
				Object.hasOwn(grant, 'conditional') ||
				Object.keys(grant).some((key) => !['gradus', 'source', 'performance'].includes(key)) ||
				!object(performance) ||
				Object.keys(performance).length !== 3 ||
				performance.speaker !== 'schola' ||
				performance.voice !== 'cantus' ||
				performance.source !== 'DMS 25 b; 26'
			)
				throw new Error('invalid participation performance');
		}
	}
}

/** This action supplements the base; it never changes ownership or timing. */
export function performanceFor(segment: Segment, form: MassForm) {
	return segment.participation?.[form]?.performance;
}

/** Folding considers every received performance, not only the priestly voice.
 * This does not alter the selected actor or create another word occurrence. */
export function voicesInMassForm(segment: Segment, form: MassForm) {
	return [inMassForm(segment, form).voice, performanceFor(segment, form)?.voice];
}

/** One note per contiguous performance, including after a rubric boundary. */
export function namesPerformance(segments: Segment[], index: number, form: MassForm): boolean {
	const current = performanceFor(segments[index], form);
	if (!current) return false;
	return index === 0 || !performanceFor(segments[index - 1], form);
}

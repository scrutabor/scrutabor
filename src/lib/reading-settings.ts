/**
 * Which reading settings can actually change this text.
 *
 * The role and Mass-form controls used to share one broad condition: more
 * than one corpus speaker, or any participation note. That made both rows
 * appear in the Angelus, although neither setting changes a single mark,
 * label or line there. These predicates compare the presentation the reader
 * can really see, so a corpus distinction that is only documentary does not
 * create an inert control.
 */
import type { MassForm, Segment } from '$lib/corpus';
import { isEveryonesResponse, isYours, mayJoin, ROLES, type Role } from '$lib/role.svelte';
import * as marks from '$lib/speaker-marks';

const MASS_FORMS = ['cantu', 'lecta'] as const satisfies readonly MassForm[];

function presentation(segments: Segment[], form: MassForm, role: Role): string {
	const effective = segments.map((segment) => marks.inMassForm(segment, form));
	const answers = marks.hasAnswers(effective) || marks.hasParticipation(effective);
	const firstVerse = effective.findIndex((segment) => segment.type === 'verse');
	const speakers = new Set(
		effective
			.filter((segment) => segment.type === 'verse' && segment.speaker)
			.map((segment) => segment.speaker!)
	);
	const sharedSpeaker = speakers.size === 1 ? [...speakers][0] : undefined;
	const sharedPrayer =
		marks.isSharedPrayer(effective, form) && (role === 'populus' || sharedSpeaker !== undefined);

	return JSON.stringify(
		effective.map((segment, index) => {
			if (segment.type !== 'verse') return ['rubric'];
			const mine = answers && isYours(segment, role, form);
			return [
				segment.speaker ?? null,
				segment.voice ?? null,
				mine,
				isEveryonesResponse(segment, form),
				mayJoin(segment, form) && marks.namesConditionalParticipation(effective, index, form),
				sharedPrayer ? index === firstVerse : marks.namesSpeaker(effective, index),
				!sharedPrayer && marks.marked(effective, index),
				marks.namesVoice(effective, index),
				sharedPrayer,
				sharedSpeaker ?? null
			];
		})
	);
}

/** Does choosing sung or low Mass alter anything rendered on this page? */
export function offersMassFormChoice(segments: Segment[]): boolean {
	return ROLES.some(
		(role) => presentation(segments, 'cantu', role) !== presentation(segments, 'lecta', role)
	);
}

/** Does choosing the reader's role alter anything rendered on this page? */
export function offersRoleChoice(segments: Segment[]): boolean {
	return MASS_FORMS.some(
		(form) => new Set(ROLES.map((role) => presentation(segments, form, role))).size > 1
	);
}

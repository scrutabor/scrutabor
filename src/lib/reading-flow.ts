import type { GlossDocument, MassForm, Segment, TextDocument } from './corpus';
import { litanyRows, type LitanyRow } from './reading-text';
import { isEveryonesResponse, mayJoin, type Role } from './role.svelte';
import * as marks from './speaker-marks';
import { textFlowUnits, type FlowRow } from './text-flow';

/** The reading settings a text's flow depends on. */
export interface FlowSettings {
	helpLevel: number;
	/** Some devotional dialogues are already clear from V./R. alone. */
	showSpeakerNames?: boolean;
	/** A standalone Mass prayer leaves its opening direction to the Ordo. */
	hideOpeningRubric?: boolean;
	/** Prayer-book setting: pair each litany invocation with its response. */
	litanyColumns?: boolean;
}

export interface FlowBinding {
	segs: Segment[];
	rows: LitanyRow[];
	firstSharedVerse: number;
	sharedSpeaker: Segment['speaker'] | undefined;
	sharedPrayer: boolean;
	options: Parameters<typeof textFlowUnits>[2];
}

/** Bind a document to the editorial rules its rendered rows follow: which
 * rows name a speaker or a voice, which carry a translation, which answer
 * for everyone. TextBody renders with this binding and the Ordo page uses
 * the same one to tell a text where its neighbour in the slot begins and
 * ends, so a seam between two bodies is priced exactly as a seam inside
 * one body. */
export function flowBinding(
	doc: TextDocument,
	gloss: GlossDocument,
	settings: FlowSettings,
	form: MassForm,
	who: Role
): FlowBinding {
	const segs = doc.segments.map((segment) => marks.inMassForm(segment, form));
	const showSpeakerNames = settings.showSpeakerNames ?? true;
	// In a continuous shared prayer (Credo, Gloria, Sanctus, Agnus Dei, and
	// the ministers' Confiteor at low Mass) V./R. would pretend that a
	// dialogue exists. Name the shared participation in words instead.
	const firstSharedVerse = segs.findIndex((segment) => segment.type === 'verse');
	const sharedSpeaker = marks.sharedSpeaker(segs);
	const sharedPrayer =
		marks.isSharedPrayer(segs, form) && (who === 'populus' || sharedSpeaker !== undefined);
	const rows: LitanyRow[] = settings.litanyColumns
		? litanyRows(segs)
		: segs.map((_, primary) => ({ primary }));
	return {
		segs,
		rows,
		firstSharedVerse,
		sharedSpeaker,
		sharedPrayer,
		options: {
			hideOpeningRubric: settings.hideOpeningRubric ?? false,
			namesWho: (i) =>
				(showSpeakerNames &&
					(sharedPrayer ? i === firstSharedVerse : marks.namesSpeaker(segs, i))) ||
				marks.namesVoice(segs, i) ||
				(mayJoin(segs[i], form) && marks.namesConditionalParticipation(segs, i, form)),
			translated: (i) => settings.helpLevel >= 2 && !!gloss.segments[segs[i].id]?.translation,
			response: (i) => isEveryonesResponse(segs[i], form)
		}
	};
}

/** The rendered flow of a document and the rows at its two edges. */
export function textFlowFor(
	doc: TextDocument,
	gloss: GlossDocument,
	settings: FlowSettings,
	form: MassForm,
	who: Role
) {
	const binding = flowBinding(doc, gloss, settings, form, who);
	const flow = textFlowUnits(binding.segs, binding.rows, binding.options);
	const units = [...flow.opening, ...flow.continuation];
	return {
		...flow,
		first: units[0]?.rows[0] as FlowRow | undefined,
		last: units.at(-1)?.rows.at(-1) as FlowRow | undefined
	};
}

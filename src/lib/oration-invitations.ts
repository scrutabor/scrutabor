/** Invitations before the two separately concluded oration groups modeled here.
 * The calendar admits at most one separate commemoration per Mass situation.
 * This is not a rule to repeat an invitation before every physical prayer. */
import type { IntroductionBody } from './introductiones';
import { commemorationLookup, SEPARATE_CONCLUSIONS, type Situation } from './commemorationes';

export interface OrationBody {
	slug: string;
	commemoration?: string;
	situation?: Situation;
}

/** Use only settled, visible bodies selected by the separate-conclusions calendar.
 * The greeting remains at the slot opening. The invitation keeps its canonical owner. */
export function orationInvitations(
	slot: string,
	bodies: readonly OrationBody[],
	openers: readonly IntroductionBody[],
	ready: boolean
): Record<string, IntroductionBody> {
	if (!ready || (slot !== 'collecta' && slot !== 'postcommunio')) return {};
	const before: Record<string, IntroductionBody> = {};
	const groups = new Map<string, { principal: boolean; addition: boolean }>();
	const slugs = new Set(openers.map((body) => body.slug));
	let previous: string | undefined;
	for (const body of bodies) {
		if (!/^[a-z0-9]+(?:[-~][a-z0-9]+)*$/.test(body.slug))
			throw new Error('invalid oration occurrence address');
		if (slugs.has(body.slug)) throw new Error('duplicate oration occurrence');
		slugs.add(body.slug);
		const situation = body.situation ?? 'determinate';
		if (situation !== previous && groups.has(situation))
			throw new Error('interleaved oration situations');
		previous = situation;
		const group = groups.get(situation) ?? { principal: false, addition: false };
		groups.set(situation, group);
		if (!body.commemoration) {
			if (group.principal) throw new Error('more than one principal oration');
			group.principal = true;
			continue;
		}
		if (!group.principal || group.addition)
			throw new Error('oration conclusion plan outside the contract');
		const declaration = commemorationLookup?.commemorations.find(
			(entry) => entry.id === body.commemoration
		);
		if (
			declaration?.conclusion !== 'separate' ||
			commemorationLookup?.profiles.length !== 1 ||
			commemorationLookup.profiles[0].id !== SEPARATE_CONCLUSIONS
		)
			throw new Error('unsupported oration conclusion profile');
		group.addition = true;
		const templates = openers.filter((run) => run.key === 'ordinarium/aufer-a-nobis');
		const template = templates[0];
		const segment = template?.doc.segments[0];
		if (
			templates.length !== 1 ||
			template.event !== `${slot}-introductio` ||
			template.slug !== `aufer-a-nobis~${slot}-introductio` ||
			template.anchor !== `text-ordinarium-aufer-a-nobis~${slot}-introductio` ||
			template.doc.id !== 'ordinarium.aufer-a-nobis' ||
			template.gloss.text !== template.doc.id ||
			template.doc.segments.length !== 1 ||
			segment?.id !== 's02' ||
			segment.type !== 'verse' ||
			segment.words?.length !== 1 ||
			segment.words[0].id !== 'w001' ||
			segment.speaker !== 'sacerdos' ||
			segment.voice !== 'clara' ||
			segment.delivery?.cantu?.speaker !== 'sacerdos' ||
			segment.delivery.cantu.voice !== 'cantus' ||
			!!segment.participation ||
			!template.gloss.segments.s02?.translation?.trim()
		)
			throw new Error('oration invitation has no complete validated owner');
		const suffix = `~commemoratio~${body.slug}`;
		const invitation = {
			...template,
			slug: `${template.slug}${suffix}`,
			anchor: `${template.anchor}${suffix}`,
			doc: structuredClone(template.doc)
		};
		if (slugs.has(invitation.slug)) throw new Error('duplicate oration invitation');
		slugs.add(invitation.slug);
		before[body.slug] = invitation;
	}
	return before;
}

/** One display order for visibility, word cards, citations and ribbon addresses. */
export function withOrationInvitations<T extends OrationBody>(
	bodies: readonly T[],
	before: Readonly<Record<string, IntroductionBody>>
): (T | IntroductionBody)[] {
	return bodies.flatMap<T | IntroductionBody>((body) =>
		before[body.slug] ? [before[body.slug], body] : [body]
	);
}

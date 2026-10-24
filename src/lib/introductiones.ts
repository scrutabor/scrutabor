// The spoken introductions that open a part of the priest-led Ordo: the greeting, its answer
// and the invitation before the Collect, the Offertory and the Postcommunion (Ritus servandus
// V, 1; VII, 1; XI, 1). The corpus owns them as addresses into existing owner texts, never as
// copied words, with the delivery of each occurrence in both forms of Mass. This consumer
// checks that contract, cuts the owner segments out of the owner documents and gives each
// run its own occurrence address. It decides nothing about the rite: no introduction precedes
// the Secret (Ritus servandus VII, 7) because the resource names none, and an introduction
// stands whether or not the day supplies the part it opens (the Easter Vigil's Offertory keeps
// its greeting and Orémus without an antiphon).
import tableData from './data/introductiones.json';
import { ROOT_MANIFEST, TEXT_KEYS, FORMULARY_METADATA } from './corpus-metadata';
import type { GlossDocument, Segment, TextDocument } from './corpus';
import { textAnchor } from './text-anchor';

export { INTRODUCTION_ROLES } from './introduction-contract';
export type {
	IntroductionRole,
	IntroductionUnit,
	IntroductionDelivery,
	IntroductionOccurrence,
	IntroductionEvent
} from './introduction-contract';
import { parseIntroductionResource, roleActor } from './introduction-contract';
import type { IntroductionEvent, ReadingRole } from './introduction-contract';

/** Fixed prayer introductions remain separate from reading-dependent events. */
export const RENDERED_INTRODUCTIONS = [
	'collecta-introductio',
	'offertorium-introductio',
	'postcommunio-introductio'
] as const;

function readingRoleIndex(): Map<string, ReadingRole> {
	const roles = new Map<string, ReadingRole>();
	for (const formulary of FORMULARY_METADATA)
		for (const component of formulary.components) {
			if (component.role !== 'epistola' && component.role !== 'evangelium') continue;
			const key = component.text.replace('.', '/');
			const previous = roles.get(key);
			if (previous && previous !== component.role)
				throw new Error('reading has conflicting formulary roles');
			roles.set(key, component.role);
		}
	return roles;
}

/** Semantic relationships, not vocabulary membership alone, determine acceptance. */
export function createIntroductionLookup(
	value: unknown,
	knownTexts = new Set(TEXT_KEYS),
	roles = readingRoleIndex()
) {
	return parseIntroductionResource(value, knownTexts, roles);
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '6.6.0' ||
			ROOT_MANIFEST.base.introductiones !== 'introductiones.json'
		)
			throw new Error('undeclared introduction resource');
		return createIntroductionLookup(tableData);
	} catch {
		return null;
	}
}
export const introductionLookup = declaredLookup();

/** The rendered events that open one of these Ordo parts, keyed by the part. */
export function introductionEventsFor(
	parts: readonly string[],
	lookup = introductionLookup
): Record<string, IntroductionEvent> {
	if (!lookup) throw new Error('introduction resource unavailable');
	const found: Record<string, IntroductionEvent> = {};
	for (const event of lookup.events) {
		if (!(RENDERED_INTRODUCTIONS as readonly string[]).includes(event.id)) continue;
		if (!parts.includes(event.before)) continue;
		if (found[event.before]) throw new Error(`two introductions open ${event.before}`);
		found[event.before] = event;
	}
	return found;
}

/** One uninterrupted run of an event's units from the same owner, read from that owner. */
export interface IntroductionBody {
	/** The owner text, whose page reads every word of the run in its own place. */
	key: string;
	event: string;
	/** An occurrence address of its own: the owner's words appear elsewhere in the Mass too. */
	slug: string;
	anchor: string;
	doc: TextDocument;
	gloss: GlossDocument;
}

/** Cut the event's owner segments out of their documents, in event order. The base speaker
 * and voice become the occurrence's low-Mass delivery and its sung delivery the only override:
 * what the resource authors for this occurrence governs it. The faithful's participation stays
 * the owner's, as the resource requires. */
export function introductionBodies(
	event: IntroductionEvent,
	owners: Record<string, { doc: TextDocument; gloss: GlossDocument } | undefined>,
	lookup = introductionLookup
): IntroductionBody[] {
	if (!lookup) throw new Error('introduction resource unavailable');
	const runs: { key: string; segments: Segment[] }[] = [];
	for (const occurrence of event.occurrences) {
		if (!('unit' in occurrence)) throw new Error('unresolved announcement slot');
		const unit = lookup.units.get(occurrence.unit);
		const owner = unit && owners[unit.text];
		if (!unit || !owner) throw new Error(`introduction ${occurrence.unit} has no owner text`);
		const found = owner.doc.segments.filter((segment) => segment.id === unit.segment);
		const segment = found[0];
		if (
			found.length !== 1 ||
			segment.type !== 'verse' ||
			JSON.stringify((segment.words ?? []).map(({ id }) => id)) !== JSON.stringify(unit.words) ||
			!owner.gloss.segments[segment.id]?.translation?.trim()
		)
			throw new Error(`introduction ${unit.id} does not address one complete owner segment`);
		if (
			owner.doc.id !== unit.text.replace('/', '.') ||
			owner.gloss.text !== owner.doc.id ||
			segment.speaker !== roleActor(unit.role, 'lecta') ||
			segment.voice !== 'clara' ||
			occurrence.lecta.speaker !== roleActor(unit.role, 'lecta') ||
			occurrence.lecta.voice !== 'clara' ||
			occurrence.cantu.speaker !== roleActor(unit.role, 'cantu') ||
			(unit.role !== 'announcement' && occurrence.cantu.voice !== 'cantus')
		)
			throw new Error(`introduction ${unit.id} owner or delivery conflicts with its role`);
		const answered = unit.role === 'response' || unit.role === 'gospel-response';
		if (
			answered
				? !segment.participation?.lecta || !segment.participation?.cantu
				: !!segment.participation
		)
			throw new Error(`introduction ${unit.id} participation conflicts with its role`);
		if (
			segment.delivery?.cantu &&
			(segment.delivery.cantu.speaker !== occurrence.cantu.speaker ||
				segment.delivery.cantu.voice !== occurrence.cantu.voice)
		)
			throw new Error(`introduction ${unit.id} sung owner override differs`);
		const cut: Segment = {
			...structuredClone(segment),
			speaker: occurrence.lecta.speaker,
			voice: occurrence.lecta.voice,
			delivery: { cantu: { speaker: occurrence.cantu.speaker, voice: occurrence.cantu.voice } }
		};
		const last = runs.at(-1);
		if (last?.key === unit.text && !last.segments.some(({ id }) => id === cut.id))
			last.segments.push(cut);
		else runs.push({ key: unit.text, segments: [cut] });
	}
	const used: Record<string, number> = {};
	return runs.map(({ key, segments }) => {
		const owner = owners[key]!;
		const count = (used[key] = (used[key] ?? 0) + 1);
		const suffix = `~${event.id}${count > 1 ? `-${count}` : ''}`;
		const doc: TextDocument = { ...owner.doc, segments };
		delete doc.retired_segments;
		delete doc.retired_words;
		return {
			key,
			event: event.id,
			slug: `${key.split('/')[1]}${suffix}`,
			anchor: `${textAnchor(key)}${suffix}`,
			doc,
			gloss: owner.gloss
		};
	});
}

/** Every owner text the rendered events read. */
export function introductionOwners(lookup = introductionLookup): string[] {
	if (!lookup) throw new Error('introduction resource unavailable');
	return [
		...new Set(
			lookup.events
				.filter(({ id }) => (RENDERED_INTRODUCTIONS as readonly string[]).includes(id))
				.flatMap(({ occurrences }) =>
					occurrences.flatMap((occurrence) =>
						'unit' in occurrence ? [lookup.units.get(occurrence.unit)!.text] : []
					)
				)
		)
	];
}

/** Owners of actual canonical readings at this slot, in formulary/component order.
 * A shared owner may also have a full-text home elsewhere in the Ordo. */
export function readingIntroductionOwners(
	role: ReadingRole,
	lookup = introductionLookup
): string[] {
	if (!lookup) throw new Error('introduction resource unavailable');
	const owners = new Set<string>();
	for (const formulary of [...FORMULARY_METADATA].sort((a, b) => a.order - b.order)) {
		for (const component of formulary.components) {
			if (component.role !== role) continue;
			const binding = lookup.announcements.get(component.text.replace('.', '/'));
			const unit = binding && lookup.units.get(binding.unit);
			if (!unit || unit.role !== 'announcement')
				throw new Error('reading introduction owner unavailable');
			owners.add(unit.text);
		}
	}
	return [...owners];
}

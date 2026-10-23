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
import { ROOT_MANIFEST, TEXT_KEYS } from './corpus-metadata';
import type { GlossDocument, Segment, Speaker, TextDocument, Voice } from './corpus';
import { object, exactKeys } from './variant-resource';
import { textAnchor } from './text-anchor';

export const INTRODUCTION_ROLES = [
	'greeting',
	'response',
	'invitation',
	'gospel-response'
] as const;
export type IntroductionRole = (typeof INTRODUCTION_ROLES)[number];

/** The events this edition of the Ordo renders. The Gospel greeting waits for the reading
 * announcements it belongs with, and for the Passion, which takes no greeting. */
export const RENDERED_INTRODUCTIONS = [
	'collecta-introductio',
	'offertorium-introductio',
	'postcommunio-introductio'
] as const;

const DELIVERY = {
	lecta: { voice: 'clara', speakers: ['sacerdos', 'minister'] },
	cantu: { voice: 'cantus', speakers: ['sacerdos', 'schola'] }
} as const;
const IDENTITY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ADDRESS = /^[a-z]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEGMENT = /^s[0-9]{2,}$/;
const WORD = /^w[0-9]{3,}$/;

export interface IntroductionUnit {
	id: string;
	role: IntroductionRole;
	/** The owner's slash address. */
	text: string;
	segment: string;
	/** The owner's word ids of that segment, in stored order. */
	words: string[];
	source: string;
}
export interface IntroductionDelivery {
	speaker: Speaker;
	voice: Voice;
	source: string;
}
export interface IntroductionOccurrence {
	unit: string;
	lecta: IntroductionDelivery;
	cantu: IntroductionDelivery;
}
export interface IntroductionEvent {
	id: string;
	/** The Ordo part it opens. */
	before: string;
	source: string;
	occurrences: IntroductionOccurrence[];
}

function nonempty(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function ordered(ids: string[]): boolean {
	return ids.every((id, index) => index === 0 || ids[index - 1] < id);
}

/** Reject a broken resource rather than omit or invent an introduction. */
export function createIntroductionLookup(value: unknown, knownTexts = new Set(TEXT_KEYS)) {
	if (
		!object(value) ||
		!exactKeys(value, ['schema_version', 'units', 'events']) ||
		value.schema_version !== '1.0.0' ||
		!Array.isArray(value.units) ||
		!value.units.length ||
		!Array.isArray(value.events) ||
		!value.events.length
	)
		throw new Error('invalid introduction resource');
	const units = new Map<string, IntroductionUnit>();
	for (const unit of value.units) {
		if (
			!object(unit) ||
			!exactKeys(unit, ['id', 'role', 'text', 'segment', 'words', 'source']) ||
			typeof unit.id !== 'string' ||
			!IDENTITY.test(unit.id) ||
			units.has(unit.id) ||
			!(INTRODUCTION_ROLES as readonly unknown[]).includes(unit.role) ||
			typeof unit.text !== 'string' ||
			!ADDRESS.test(unit.text) ||
			!knownTexts.has(unit.text) ||
			typeof unit.segment !== 'string' ||
			!SEGMENT.test(unit.segment) ||
			!Array.isArray(unit.words) ||
			!unit.words.length ||
			new Set(unit.words).size !== unit.words.length ||
			unit.words.some((word) => typeof word !== 'string' || !WORD.test(word)) ||
			!nonempty(unit.source)
		)
			throw new Error('invalid introduction unit');
		units.set(unit.id, unit as unknown as IntroductionUnit);
	}
	if (!ordered([...units.keys()])) throw new Error('introduction units out of order');
	const events: IntroductionEvent[] = [];
	for (const event of value.events) {
		if (
			!object(event) ||
			!exactKeys(event, ['id', 'before', 'source', 'occurrences']) ||
			typeof event.id !== 'string' ||
			!IDENTITY.test(event.id) ||
			events.some(({ id }) => id === event.id) ||
			!nonempty(event.before) ||
			!nonempty(event.source) ||
			!Array.isArray(event.occurrences) ||
			!event.occurrences.length
		)
			throw new Error('invalid introduction event');
		for (const occurrence of event.occurrences) {
			if (
				!object(occurrence) ||
				!exactKeys(occurrence, ['unit', 'lecta', 'cantu']) ||
				typeof occurrence.unit !== 'string' ||
				!units.has(occurrence.unit)
			)
				throw new Error('invalid introduction occurrence');
			for (const form of ['lecta', 'cantu'] as const) {
				const delivery = occurrence[form];
				if (
					!object(delivery) ||
					!exactKeys(delivery, ['speaker', 'voice', 'source']) ||
					delivery.voice !== DELIVERY[form].voice ||
					!(DELIVERY[form].speakers as readonly unknown[]).includes(delivery.speaker) ||
					!nonempty(delivery.source)
				)
					throw new Error('invalid introduction delivery');
			}
		}
		events.push(event as unknown as IntroductionEvent);
	}
	if (!ordered(events.map(({ id }) => id))) throw new Error('introduction events out of order');
	for (const id of RENDERED_INTRODUCTIONS)
		if (!events.some((event) => event.id === id))
			throw new Error(`introduction event ${id} is absent`);
	return { units, events };
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '6.1.0' ||
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
				.flatMap(({ occurrences }) => occurrences.map(({ unit }) => lookup.units.get(unit)!.text))
		)
	];
}

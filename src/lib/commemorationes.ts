// The corpus owns each commemoration's date, rank and admission; this
// consumer does no calendar arithmetic and infers no procession or local use.
//
// Selection schema 2.1.0 states one decision for each situation of the Mass
// (RG 108): a low Mass, a sung conventual Mass and a sung Mass that is not
// conventual. The reader's low/sung control does not establish conventual
// status, so where the two sung decisions differ both are kept and the Ordo
// describes them as alternatives instead of guessing one.
//
// A commemoration is either addressed, its slots naming its own texts, or
// resolved per pair: the impeded Sunday, the Advent feria and the impeded
// feast name no text of their own, and each pair names the formulary whose
// Collect, Secret and Postcommunion it says on that date. Commemorations are
// addressed by identity, never by position.
import tableData from './data/commemorationes.json';
import {
	ROOT_MANIFEST,
	TEXT_METADATA,
	FORMULARY_METADATA,
	commemorationTitle,
	type FormularyComponentMetadata
} from './corpus-metadata';
import { isCivilDate } from './kalendarium';
import { dayById } from './proprium';
import { M, type Lang } from './i18n';
import type { GlossDocument, TextDocument } from './corpus';
import type { TextBibliographyEvidence } from './bibliography';
import {
	object,
	exactKeys,
	validateVariantPack,
	type VariantBody,
	type VariantPack
} from './variant-resource';

export const COMMEMORATION_SLOTS = ['collecta', 'secreta', 'postcommunio'] as const;
export type CommemorationSlot = (typeof COMMEMORATION_SLOTS)[number];
export const SEPARATE_CONCLUSIONS = 'ordinary-separate-conclusions';
export const SITUATIONS = ['lecta', 'cantu-conventualis', 'cantu-non-conventualis'] as const;
export type Situation = (typeof SITUATIONS)[number];
export const DECISIONS = [
	'admitted',
	'not-admitted',
	'omitted-required-de-tempore-unavailable'
] as const;
export type Decision = (typeof DECISIONS)[number];
const RANKS = ['privileged', 'ordinary'] as const;
const IDENTITY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface CommemorationSlotEntry {
	key: CommemorationSlot;
	after: CommemorationSlot;
	/** Slash-addressed reader text, as every other transported body, or null where the slot is
	 * resolved per pair to the oration of its role that the pair's formulary assembles. */
	text: string | null;
}
export interface CommemorationEntry {
	id: string;
	/** The Latin name, as the formulary catalogue carries one. */
	title: string;
	rank: (typeof RANKS)[number];
	conclusion: 'separate';
	slots: CommemorationSlotEntry[];
	/** Every slot is resolved per pair: the commemoration has no orations of its own. */
	resolved: boolean;
}
export interface CommemorationProfile {
	id: typeof SEPARATE_CONCLUSIONS;
}
export interface ActiveCommemoration {
	commemoration: CommemorationEntry;
	profile: CommemorationProfile;
	/** The formulary whose orations a resolved commemoration says here; null for addressed slots. */
	formulary: string | null;
	/** The text each slot says on this date, in slot order. */
	texts: string[];
}
/** One published pair: a commemoration on a represented date and Mass, decided per situation. */
export interface CommemorationDecision {
	commemoration: CommemorationEntry;
	profile: CommemorationProfile;
	/** The resolved formulary the pair names; null for a commemoration with addressed slots. */
	formulary: string | null;
	decisions: Record<Situation, Decision>;
}
/** A commemoration this Mass owes and cannot say: a resolved pair decided
 * omitted-required-de-tempore-unavailable still names the formulary that would supply it. */
export interface MissingCommemoration {
	commemoration: CommemorationEntry;
	formulary: string;
}
/** What one situation makes of the Mass. `unavailable` names a commemoration omitted because
 * a required de Tempore commemoration this edition does not yet carry takes its place, and
 * `missing` a required commemoration whose own orations this edition does not yet carry: the
 * Mass is then incomplete, and is never presented as having no commemoration. */
export interface CommemorationPlan {
	admitted: ActiveCommemoration[];
	unavailable: CommemorationEntry[];
	missing: MissingCommemoration[];
}
/** One published pair of a commemoration, as its catalogue page lists them. */
export interface CommemorationDate {
	date: string;
	mass: string;
	formulary: string | null;
	decisions: Record<Situation, Decision>;
}
export type CommemorationBody = VariantBody<CommemorationSlot>;
export type CommemorationPack = VariantPack<CommemorationSlot>;

function isSlot(value: unknown): value is CommemorationSlot {
	return (COMMEMORATION_SLOTS as readonly unknown[]).includes(value);
}

function isIndex(value: unknown, length: number): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
}

/** Rows compare as typed tuples: a canonical date as a string and every index as a number,
 * never as an interpolated string, in which index 10 would sort before index 2. Callers
 * have already checked that both rows hold the same type at each position. */
export function compareTypedRows(
	left: readonly (string | number)[],
	right: readonly (string | number)[]
): number {
	for (let i = 0; i < Math.min(left.length, right.length); i++) {
		if (left[i] === right[i]) continue;
		return left[i] < right[i] ? -1 : 1;
	}
	return left.length - right.length;
}

function sameList(value: unknown, expected: readonly unknown[]): boolean {
	return JSON.stringify(value) === JSON.stringify(expected);
}

type OrationComponent = Pick<FormularyComponentMetadata, 'role' | 'text' | 'condition'>;

/** The Collect, Secret and Postcommunion a formulary assembles, in slot order, read from its
 * components by role: a reference component says the text it transfers. Null when the formulary
 * is not in this edition or lacks one of them. A role with several components, or a conditional
 * one, is not one oration a commemoration could say, and fails closed. */
export function formularyOrations(components: readonly OrationComponent[] | undefined) {
	if (!components) return null;
	const texts: string[] = [];
	for (const role of COMMEMORATION_SLOTS) {
		const found = components.filter((component) => component.role === role);
		if (!found.length) return null;
		if (found.length !== 1 || found[0].condition)
			throw new Error('formulary has no single unconditional oration');
		texts.push(found[0].text);
	}
	return texts;
}

/** Reject a broken resource rather than invent or drop a commemoration. */
export function createCommemorationLookup(
	value: unknown,
	knownTexts = new Set(TEXT_METADATA.map(({ id }) => id.replace('.', '/'))),
	knownMasses = new Set(FORMULARY_METADATA.map(({ id }) => id)),
	knownComponents = new Map<string, readonly OrationComponent[]>(
		FORMULARY_METADATA.map(({ id, components }) => [id, components])
	)
) {
	if (
		!object(value) ||
		!exactKeys(value, [
			'schema_version',
			'commemorations',
			'profiles',
			'situations',
			'decisions',
			'masses',
			'occurrences',
			'pairs'
		]) ||
		value.schema_version !== '2.1.0' ||
		!sameList(value.profiles, [{ id: SEPARATE_CONCLUSIONS }]) ||
		!sameList(value.situations, SITUATIONS) ||
		!sameList(
			value.decisions,
			DECISIONS.map((id) => ({ id }))
		) ||
		!Array.isArray(value.commemorations) ||
		!value.commemorations.length
	)
		throw new Error('invalid commemoration resource');
	const masses = value.masses;
	if (
		!Array.isArray(masses) ||
		masses.length !== knownMasses.size ||
		masses.some(
			(mass, index) =>
				typeof mass !== 'string' ||
				!knownMasses.has(mass) ||
				(index > 0 && String(masses[index - 1]) >= mass)
		)
	)
		throw new Error('invalid commemoration masses');
	const commemorations: CommemorationEntry[] = [];
	for (const entry of value.commemorations) {
		if (
			!object(entry) ||
			!exactKeys(entry, ['id', 'title', 'rank', 'conclusion', 'slots']) ||
			typeof entry.id !== 'string' ||
			typeof entry.title !== 'string' ||
			!entry.title.trim() ||
			!IDENTITY.test(entry.id) ||
			(commemorations.length && commemorations[commemorations.length - 1].id >= entry.id) ||
			!(RANKS as readonly unknown[]).includes(entry.rank) ||
			entry.conclusion !== 'separate' ||
			!Array.isArray(entry.slots) ||
			entry.slots.length !== COMMEMORATION_SLOTS.length
		)
			throw new Error('invalid commemoration entry');
		const slots: CommemorationSlotEntry[] = [];
		for (const [index, slot] of entry.slots.entries()) {
			const expected = COMMEMORATION_SLOTS[index];
			if (
				!object(slot) ||
				!exactKeys(slot, ['key', 'after', 'text']) ||
				slot.key !== expected ||
				slot.after !== expected ||
				(slot.text !== null && (typeof slot.text !== 'string' || !knownTexts.has(slot.text)))
			)
				throw new Error('invalid commemoration slot');
			slots.push({ key: expected, after: expected, text: slot.text });
		}
		// A commemoration says its own three texts or is resolved whole: a set that addressed some
		// slots and left others to a formulary would have no single source for its orations.
		const resolved = slots.every(({ text }) => text === null);
		if (!resolved && slots.some(({ text }) => text === null))
			throw new Error('invalid commemoration slot');
		commemorations.push({
			id: entry.id,
			title: entry.title,
			rank: entry.rank as CommemorationEntry['rank'],
			conclusion: 'separate',
			slots,
			resolved
		});
	}
	const profiles: CommemorationProfile[] = [{ id: SEPARATE_CONCLUSIONS }];
	const occurrences = new Map<string, CommemorationEntry[]>();
	const published = new Set<string>();
	if (!Array.isArray(value.occurrences) || !value.occurrences.length)
		throw new Error('invalid commemoration occurrences');
	let previous: (string | number)[] | null = null;
	for (const row of value.occurrences) {
		if (
			!Array.isArray(row) ||
			row.length !== 2 ||
			typeof row[0] !== 'string' ||
			!isCivilDate(row[0]) ||
			!isIndex(row[1], commemorations.length)
		)
			throw new Error('invalid commemoration occurrence');
		const key: (string | number)[] = [row[0], row[1]];
		if (previous && compareTypedRows(previous, key) >= 0)
			throw new Error('duplicate or unordered occurrence');
		previous = key;
		published.add(`${row[0]}|${row[1]}`);
		occurrences.set(row[0], [...(occurrences.get(row[0]) ?? []), commemorations[row[1]]]);
	}
	// Each pair keeps the texts its slots say: the addressed texts, or the orations of the
	// formulary an admitted resolved pair names. A resolved pair that is not admitted anywhere
	// says nothing and keeps none.
	const pairs = new Map<string, { decision: CommemorationDecision; texts: string[] | null }[]>();
	const dates = new Map<string, CommemorationDate[]>();
	if (!Array.isArray(value.pairs)) throw new Error('invalid commemoration pairs');
	previous = null;
	const places = new Map<string, Decision[]>();
	const width = 4 + SITUATIONS.length;
	for (const row of value.pairs) {
		if (
			!Array.isArray(row) ||
			row.length !== width + 1 ||
			typeof row[0] !== 'string' ||
			!isCivilDate(row[0]) ||
			!isIndex(row[1], masses.length) ||
			!isIndex(row[2], commemorations.length) ||
			!isIndex(row[3], profiles.length) ||
			row.slice(4, width).some((decision) => !isIndex(decision, DECISIONS.length)) ||
			!published.has(`${row[0]}|${row[2]}`)
		)
			throw new Error('invalid commemoration pair');
		const key: (string | number)[] = [row[0], row[1], row[2]];
		if (previous && compareTypedRows(previous, key) >= 0)
			throw new Error('duplicate or unordered commemoration pair');
		previous = key;
		const commemoration = commemorations[row[2]];
		// A pair names a formulary exactly when its commemoration is resolved per pair.
		const formulary: unknown = row[width];
		if (
			commemoration.resolved
				? typeof formulary !== 'string' || !IDENTITY.test(formulary)
				: formulary !== null
		)
			throw new Error('commemoration resolution outside the contract');
		const plan = (row.slice(4, width) as number[]).map((index) => DECISIONS[index]);
		// The contract's own invariants: a privileged commemoration is made in all Masses, or, when
		// the formulary its pair resolves to cannot supply it, is owed in all of them; an ordinary
		// one has a single decision for the low and the sung conventual Mass and is not admitted
		// in a sung Mass that is not conventual. A resolved ordinary one is published only where
		// its formulary is in this edition, so it is made in the low and the sung conventual Mass.
		const everywhere = (decision: Decision) => plan.every((made) => made === decision);
		const ordinary =
			plan[0] === plan[1] &&
			plan[2] === 'not-admitted' &&
			(!commemoration.resolved || plan[0] === 'admitted');
		if (
			commemoration.rank === 'privileged'
				? !everywhere('admitted') &&
					!(commemoration.resolved && everywhere('omitted-required-de-tempore-unavailable'))
				: !ordinary
		)
			throw new Error('commemoration decisions outside the contract');
		let texts: string[] | null = commemoration.resolved
			? null
			: commemoration.slots.map(({ text }) => text as string);
		// A resolution owed and unavailable in every situation says nothing, so it may name a Mass
		// this edition does not author (the Ember days of Advent). An admitted one may not.
		if (typeof formulary === 'string' && plan.includes('admitted')) {
			// An admitted resolution names an authored Mass whose three orations are in this edition.
			if (!knownMasses.has(formulary))
				throw new Error('commemoration resolution names no authored Mass');
			texts = formularyOrations(knownComponents.get(formulary));
			if (!texts || texts.some((text) => !knownTexts.has(text)))
				throw new Error('commemoration resolution without its orations');
		}
		const decisions = Object.fromEntries(
			SITUATIONS.map((situation, index) => [situation, plan[index]])
		) as Record<Situation, Decision>;
		const resolution = typeof formulary === 'string' ? formulary : null;
		const mass = `${row[0]}/${masses[row[1]]}`;
		pairs.set(mass, [
			...(pairs.get(mass) ?? []),
			{
				decision: { commemoration, profile: profiles[row[3]], formulary: resolution, decisions },
				texts
			}
		]);
		dates.set(commemoration.id, [
			...(dates.get(commemoration.id) ?? []),
			{ date: row[0], mass: masses[row[1]], formulary: resolution, decisions }
		]);
		for (const situation of SITUATIONS) {
			const place = `${mass}/${situation}`;
			places.set(place, [...(places.get(place) ?? []), decisions[situation]]);
		}
	}
	// One admitted commemoration at most in each situation, and none beside an unavailable de
	// Tempore commemoration: a second would need an order and a conclusion plan this contract
	// does not model, and the nonfinal Secret delivery assumes the single addition.
	for (const decisions of places.values()) {
		const admitted = decisions.filter((decision) => decision === 'admitted').length;
		if (admitted > 1 || (admitted && decisions.includes('omitted-required-de-tempore-unavailable')))
			throw new Error('more commemorations than the contract models');
	}
	function decided(date: string, mass: string) {
		if (!isCivilDate(date) || !knownMasses.has(mass)) throw new Error('unsupported date/Mass');
		return pairs.get(`${date}/${mass}`) ?? [];
	}
	return {
		commemorations,
		profiles,
		/** Acknowledged occurrences on a civil date, whether or not a Mass is represented. */
		occurrencesOn(date: string): CommemorationEntry[] {
			if (!isCivilDate(date)) throw new Error('unsupported date');
			return occurrences.get(date) ?? [];
		},
		/** Every published decision for this represented Mass; none is a real answer. */
		resolve(date: string, mass: string): CommemorationDecision[] {
			return decided(date, mass).map(({ decision }) => decision);
		},
		/** Every published pair of one commemoration, by identity, in date order. */
		datesOf(commemoration: string): CommemorationDate[] {
			if (!commemorations.some(({ id }) => id === commemoration))
				throw new Error('unknown commemoration');
			return dates.get(commemoration) ?? [];
		},
		/** The commemorations made in one situation of this Mass, and those it owes but lacks. */
		plan(date: string, mass: string, situation: Situation): CommemorationPlan {
			if (!(SITUATIONS as readonly string[]).includes(situation))
				throw new Error('unsupported situation');
			const found = decided(date, mass);
			const owed = found.filter(
				({ decision }) =>
					decision.decisions[situation] === 'omitted-required-de-tempore-unavailable'
			);
			return {
				admitted: found
					.filter(({ decision }) => decision.decisions[situation] === 'admitted')
					.map(({ decision: { commemoration, profile, formulary }, texts }) => ({
						commemoration,
						profile,
						formulary,
						texts: texts ?? []
					})),
				// An ordinary commemoration so decided gives way to a de Tempore one this edition
				// lacks; a privileged one is itself the commemoration the Mass owes.
				unavailable: owed
					.filter(({ decision }) => decision.commemoration.rank !== 'privileged')
					.map(({ decision }) => decision.commemoration),
				missing: owed.flatMap(({ decision: { commemoration, formulary } }) =>
					commemoration.rank === 'privileged' && formulary !== null
						? [{ commemoration, formulary }]
						: []
				)
			};
		}
	};
}

/** How the reader names each commemoration resolved per pair, by identity. The impeded Sunday and
 * the impeded feast are the formulary whose orations they say, so they are called by it
 * ("commemoration: 13th Sunday after Pentecost"). The Advent feria says the preceding Sunday's
 * orations without being that Sunday, so it keeps its own title and names the formulary of its
 * prayers ("commemoration: Weekday of Advent (prayers: Second Sunday of Advent)"). */
export const RESOLVED_HEADINGS: Readonly<Record<string, 'formulary' | 'prayers'>> = {
	'dominica-impedita': 'formulary',
	'feria-adventus': 'prayers',
	'festum-impeditum': 'formulary'
};

/** What the reader calls a commemoration made on a date: a resolved one as RESOLVED_HEADINGS
 * says, any other by its own title. A resolved commemoration without a heading of its own fails
 * closed. A formulary this edition does not carry falls back to the commemoration's title. */
export function commemorationName(
	commemoration: string,
	formulary: string | null | undefined,
	lang: Lang
): string {
	if (!formulary) return commemorationTitle(commemoration, lang);
	if (!Object.hasOwn(RESOLVED_HEADINGS, commemoration))
		throw new Error('resolved commemoration without its heading');
	const day = dayById(formulary);
	if (!day) return commemorationTitle(commemoration, lang);
	return RESOLVED_HEADINGS[commemoration] === 'formulary'
		? day.title[lang]
		: M[lang].commemorationPrayersOf
				.replace('{commemoration}', commemorationTitle(commemoration, lang))
				.replace('{formulary}', day.title[lang]);
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '6.7.0' ||
			ROOT_MANIFEST.base.commemorationes !== 'commemorationes.json'
		)
			throw new Error('undeclared commemoration resource');
		return createCommemorationLookup(tableData);
	} catch {
		return null;
	}
}
export const commemorationLookup = declaredLookup();

/** Every addressed slot body, once, with the Mass role it follows. A resolved commemoration
 * has none: its orations are the formulary's own and travel with that formulary. */
export const COMMEMORATION_DECLARATIONS: { key: string; slot: CommemorationSlot }[] = [];
for (const entry of commemorationLookup?.commemorations ?? []) {
	for (const slot of entry.slots) {
		const text = slot.text;
		if (text === null) continue;
		if (!COMMEMORATION_DECLARATIONS.some((declared) => declared.key === text))
			COMMEMORATION_DECLARATIONS.push({ key: text, slot: slot.after });
	}
}
export const COMMEMORATION_TEXT_KEYS = COMMEMORATION_DECLARATIONS.map(({ key }) => key);

export function validateCommemorationPack(value: unknown, lang: Lang): CommemorationPack {
	if (!commemorationLookup) throw new Error('commemoration resource unavailable');
	return validateVariantPack(value, lang, COMMEMORATION_DECLARATIONS);
}

export interface SelectedCommemorationBody extends CommemorationBody {
	commemoration: string;
	/** The formulary a resolved commemoration's oration comes from. */
	formulary?: string;
}

/** The oration bodies a resolved commemoration can take from one formulary's own validated
 * parts: each part in one of the three commemoration slots, as the body of that slot. */
export function orationBodies(
	parts: readonly {
		key: string;
		part: string;
		slot: string;
		doc: unknown;
		gloss: unknown;
		bibliography: TextBibliographyEvidence;
	}[]
): CommemorationBody[] {
	return parts.flatMap(({ key, part, slot, doc, gloss, bibliography }) =>
		isSlot(part) && slot === part
			? [
					{
						key,
						part,
						slot: part,
						doc: doc as TextDocument,
						gloss: gloss as GlossDocument,
						bibliography
					}
				]
			: []
	);
}

/** The orations of each active commemoration, in resource order, each after its Mass role: an
 * addressed set from the transport pack, a resolved one from the bodies of the formulary its
 * pair names, keyed by that formulary's identity. */
export function selectedCommemorations(
	active: ActiveCommemoration[],
	pack: CommemorationPack | null,
	resolved: Readonly<Record<string, readonly CommemorationBody[]>> = {}
): SelectedCommemorationBody[] {
	return active.flatMap(({ commemoration, profile, formulary, texts }) => {
		if (profile.id !== SEPARATE_CONCLUSIONS) throw new Error('unsupported commemoration profile');
		const bodies =
			formulary === null
				? pack?.parts
				: Object.hasOwn(resolved, formulary)
					? resolved[formulary]
					: undefined;
		return commemoration.slots.map((slot, index) => {
			const body = bodies?.find((part) => part.key === texts[index]);
			if (!body || body.slot !== slot.after || !isSlot(body.slot))
				throw new Error('selected commemoration body absent');
			return formulary === null
				? { ...body, commemoration: commemoration.id }
				: { ...body, commemoration: commemoration.id, formulary };
		});
	});
}

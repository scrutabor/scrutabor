// The corpus owns each commemoration's date, rank and admission; this
// consumer does no calendar arithmetic and infers no procession or local use.
//
// Selection schema 2.0.0 states one decision for each situation of the Mass
// (RG 108): a low Mass, a sung conventual Mass and a sung Mass that is not
// conventual. The reader's low/sung control does not establish conventual
// status, so where the two sung decisions differ both are kept and the Ordo
// describes them as alternatives instead of guessing one.
import tableData from './data/commemorationes.json';
import { ROOT_MANIFEST, TEXT_METADATA, FORMULARY_METADATA } from './corpus-metadata';
import { isCivilDate } from './kalendarium';
import type { Lang } from './i18n';
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
	/** Slash-addressed reader text, as every other transported body. */
	text: string;
}
export interface CommemorationEntry {
	id: string;
	/** The Latin name, as the formulary catalogue carries one. */
	title: string;
	rank: (typeof RANKS)[number];
	conclusion: 'separate';
	slots: CommemorationSlotEntry[];
}
export interface CommemorationProfile {
	id: typeof SEPARATE_CONCLUSIONS;
}
export interface ActiveCommemoration {
	commemoration: CommemorationEntry;
	profile: CommemorationProfile;
}
/** One published pair: a commemoration on a represented date and Mass, decided per situation. */
export interface CommemorationDecision extends ActiveCommemoration {
	decisions: Record<Situation, Decision>;
}
/** What one situation makes of the Mass. `unavailable` names a commemoration omitted because
 * a required de Tempore commemoration this edition does not yet carry takes its place: the
 * Mass is then incomplete, and is never presented as having no commemoration. */
export interface CommemorationPlan {
	admitted: ActiveCommemoration[];
	unavailable: CommemorationEntry[];
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

/** Reject a broken resource rather than invent or drop a commemoration. */
export function createCommemorationLookup(
	value: unknown,
	knownTexts = new Set(TEXT_METADATA.map(({ id }) => id.replace('.', '/'))),
	knownMasses = new Set(FORMULARY_METADATA.map(({ id }) => id))
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
		value.schema_version !== '2.0.0' ||
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
				typeof slot.text !== 'string' ||
				!knownTexts.has(slot.text)
			)
				throw new Error('invalid commemoration slot');
			slots.push({ key: expected, after: expected, text: slot.text });
		}
		commemorations.push({
			id: entry.id,
			title: entry.title,
			rank: entry.rank as CommemorationEntry['rank'],
			conclusion: 'separate',
			slots
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
	const pairs = new Map<string, CommemorationDecision[]>();
	if (!Array.isArray(value.pairs)) throw new Error('invalid commemoration pairs');
	previous = null;
	const places = new Map<string, Decision[]>();
	for (const row of value.pairs) {
		if (
			!Array.isArray(row) ||
			row.length !== 4 + SITUATIONS.length ||
			typeof row[0] !== 'string' ||
			!isCivilDate(row[0]) ||
			!isIndex(row[1], masses.length) ||
			!isIndex(row[2], commemorations.length) ||
			!isIndex(row[3], profiles.length) ||
			row.slice(4).some((decision) => !isIndex(decision, DECISIONS.length)) ||
			!published.has(`${row[0]}|${row[2]}`)
		)
			throw new Error('invalid commemoration pair');
		const key: (string | number)[] = [row[0], row[1], row[2]];
		if (previous && compareTypedRows(previous, key) >= 0)
			throw new Error('duplicate or unordered commemoration pair');
		previous = key;
		const commemoration = commemorations[row[2]];
		const plan = (row.slice(4) as number[]).map((index) => DECISIONS[index]);
		// The contract's own invariants: a privileged commemoration is made in all Masses, an
		// ordinary one has a single decision for the low and the sung conventual Mass and is
		// not admitted in a sung Mass that is not conventual.
		if (
			commemoration.rank === 'privileged'
				? plan.some((decision) => decision !== 'admitted')
				: plan[0] !== plan[1] || plan[2] !== 'not-admitted'
		)
			throw new Error('commemoration decisions outside the contract');
		const decisions = Object.fromEntries(
			SITUATIONS.map((situation, index) => [situation, plan[index]])
		) as Record<Situation, Decision>;
		const mass = `${row[0]}/${masses[row[1]]}`;
		pairs.set(mass, [
			...(pairs.get(mass) ?? []),
			{ commemoration, profile: profiles[row[3]], decisions }
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
	function decided(date: string, mass: string): CommemorationDecision[] {
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
		resolve: decided,
		/** The commemorations made in one situation of this Mass, and those it owes but lacks. */
		plan(date: string, mass: string, situation: Situation): CommemorationPlan {
			if (!(SITUATIONS as readonly string[]).includes(situation))
				throw new Error('unsupported situation');
			const found = decided(date, mass);
			return {
				admitted: found
					.filter(({ decisions }) => decisions[situation] === 'admitted')
					.map(({ commemoration, profile }) => ({ commemoration, profile })),
				unavailable: found
					.filter(
						({ decisions }) => decisions[situation] === 'omitted-required-de-tempore-unavailable'
					)
					.map(({ commemoration }) => commemoration)
			};
		}
	};
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '6.1.0' ||
			ROOT_MANIFEST.base.commemorationes !== 'commemorationes.json'
		)
			throw new Error('undeclared commemoration resource');
		return createCommemorationLookup(tableData);
	} catch {
		return null;
	}
}
export const commemorationLookup = declaredLookup();

/** Every slot body, once, with the Mass role it follows. */
export const COMMEMORATION_DECLARATIONS: { key: string; slot: CommemorationSlot }[] = [];
for (const entry of commemorationLookup?.commemorations ?? []) {
	for (const slot of entry.slots) {
		if (!COMMEMORATION_DECLARATIONS.some((declared) => declared.key === slot.text))
			COMMEMORATION_DECLARATIONS.push({ key: slot.text, slot: slot.after });
	}
}
export const COMMEMORATION_TEXT_KEYS = COMMEMORATION_DECLARATIONS.map(({ key }) => key);

export function validateCommemorationPack(value: unknown, lang: Lang): CommemorationPack {
	if (!commemorationLookup) throw new Error('commemoration resource unavailable');
	return validateVariantPack(value, lang, COMMEMORATION_DECLARATIONS);
}

export interface SelectedCommemorationBody extends CommemorationBody {
	commemoration: string;
}

/** The orations of each active commemoration, in resource order, each after its Mass role. */
export function selectedCommemorations(
	active: ActiveCommemoration[],
	pack: CommemorationPack | null
): SelectedCommemorationBody[] {
	return active.flatMap(({ commemoration, profile }) => {
		if (profile.id !== SEPARATE_CONCLUSIONS) throw new Error('unsupported commemoration profile');
		return commemoration.slots.map((slot) => {
			const body = pack?.parts.find((part) => part.key === slot.text);
			if (!body || body.slot !== slot.after || !isSlot(body.slot))
				throw new Error('selected commemoration body absent');
			return { ...body, commemoration: commemoration.id };
		});
	});
}

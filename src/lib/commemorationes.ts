// The corpus owns each commemoration's date, rank and admission; this
// consumer does no calendar arithmetic and infers no procession or local use.
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
export type CommemorationBody = VariantBody<CommemorationSlot>;
export type CommemorationPack = VariantPack<CommemorationSlot>;

function isSlot(value: unknown): value is CommemorationSlot {
	return (COMMEMORATION_SLOTS as readonly unknown[]).includes(value);
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
			'masses',
			'occurrences',
			'pairs'
		]) ||
		value.schema_version !== '1.0.0' ||
		!Array.isArray(value.profiles) ||
		value.profiles.length !== 1 ||
		!object(value.profiles[0]) ||
		!exactKeys(value.profiles[0], ['id']) ||
		value.profiles[0].id !== SEPARATE_CONCLUSIONS ||
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
	const profiles = value.profiles as CommemorationProfile[];
	const occurrences = new Map<string, CommemorationEntry[]>();
	if (!Array.isArray(value.occurrences) || !value.occurrences.length)
		throw new Error('invalid commemoration occurrences');
	let previous = '';
	for (const row of value.occurrences) {
		if (
			!Array.isArray(row) ||
			row.length !== 2 ||
			!isCivilDate(row[0]) ||
			!Number.isInteger(row[1]) ||
			row[1] < 0 ||
			row[1] >= commemorations.length
		)
			throw new Error('invalid commemoration occurrence');
		const key = `${row[0]}/${row[1]}`;
		if (previous && previous >= key) throw new Error('duplicate or unordered occurrence');
		previous = key;
		occurrences.set(row[0], [...(occurrences.get(row[0]) ?? []), commemorations[row[1]]]);
	}
	const pairs = new Map<string, ActiveCommemoration[]>();
	if (!Array.isArray(value.pairs)) throw new Error('invalid commemoration pairs');
	previous = '';
	for (const row of value.pairs) {
		if (
			!Array.isArray(row) ||
			row.length !== 4 ||
			!isCivilDate(row[0]) ||
			row.slice(1).some((index) => !Number.isInteger(index) || index < 0) ||
			row[1] >= masses.length ||
			row[2] >= commemorations.length ||
			row[3] >= profiles.length ||
			!occurrences.get(row[0])?.includes(commemorations[row[2]])
		)
			throw new Error('invalid commemoration pair');
		const key = `${row[0]}/${masses[row[1]]}/${row[2]}`;
		if (previous && previous >= key) throw new Error('duplicate or unordered commemoration pair');
		previous = key;
		const mass = `${row[0]}/${masses[row[1]]}`;
		pairs.set(mass, [
			...(pairs.get(mass) ?? []),
			{ commemoration: commemorations[row[2]], profile: profiles[row[3]] }
		]);
	}
	return {
		commemorations,
		profiles,
		/** Acknowledged occurrences on a civil date, whether or not a Mass is represented. */
		occurrencesOn(date: string): CommemorationEntry[] {
			if (!isCivilDate(date)) throw new Error('unsupported date');
			return occurrences.get(date) ?? [];
		},
		/** The commemorations actually made in this represented Mass; none is a real answer. */
		resolve(date: string, mass: string): ActiveCommemoration[] {
			if (!isCivilDate(date) || !knownMasses.has(mass)) throw new Error('unsupported date/Mass');
			return pairs.get(`${date}/${mass}`) ?? [];
		}
	};
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '5.12.0' ||
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

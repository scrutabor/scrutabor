// The reader owns the date/Mass table. This consumer does no calendar arithmetic.
import tableData from './data/canon.json';
import { ROOT_MANIFEST, TEXT_METADATA, hasText } from './corpus-metadata';
import { isCivilDate } from './kalendarium';
import type { Lang } from './i18n';
import type { TextDocument, GlossDocument, Lexicon } from './corpus';
import type { TextBibliographyEvidence } from './bibliography';

export const CANON_ROLES = ['communicantes', 'hanc-igitur', 'qui-pridie'] as const;
export type CanonRole = (typeof CANON_ROLES)[number];
const PROFILE_IDS = [
	'ordinary',
	'nativitas-in-nocte',
	'nativitas-in-die',
	'epiphania',
	'in-cena-domini',
	'pascha-in-nocte',
	'pascha-in-die',
	'ascensio',
	'pentecostes'
];
export interface CanonProfile {
	id: string;
	texts: Record<CanonRole, string>;
}
interface CanonTable {
	schema_version: string;
	roles: string[];
	profiles: CanonProfile[];
	masses: string[];
	pairs: [string, number, number][];
}
export interface CanonBody {
	key: string;
	part: CanonRole;
	slot: CanonRole;
	doc: TextDocument;
	gloss: GlossDocument;
	bibliography: TextBibliographyEvidence;
}
export interface CanonPack {
	schema_version: string;
	lang: Lang;
	parts: CanonBody[];
	lex: Lexicon;
}

function object(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	return (
		Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
	);
}
export function isCanonRole(slot: string): slot is CanonRole {
	return (CANON_ROLES as readonly string[]).includes(slot);
}
export function canonKey(id: string): string {
	return id.replace('.', '/');
}
export function ordinaryCanon(role: CanonRole): string {
	return `ordinarium.${role}`;
}

/** Reject a broken resource, rather than invent an Ordinary default. */
export function createCanonLookup(
	value: unknown,
	known = new Set(TEXT_METADATA.map((text) => text.id))
) {
	if (
		!object(value) ||
		!exactKeys(value, ['schema_version', 'roles', 'profiles', 'masses', 'pairs']) ||
		value.schema_version !== '1.0.0' ||
		JSON.stringify(value.roles) !== JSON.stringify(CANON_ROLES) ||
		!Array.isArray(value.profiles) ||
		value.profiles.length !== PROFILE_IDS.length ||
		!Array.isArray(value.masses) ||
		!value.masses.length ||
		!Array.isArray(value.pairs) ||
		!value.pairs.length
	)
		throw new Error('invalid Canon resource');
	for (const [i, profile] of value.profiles.entries()) {
		if (
			!object(profile) ||
			!exactKeys(profile, ['id', 'texts']) ||
			profile.id !== PROFILE_IDS[i] ||
			!object(profile.texts) ||
			!exactKeys(profile.texts, CANON_ROLES)
		)
			throw new Error('invalid Canon profile');
		for (const role of CANON_ROLES) {
			const id = profile.texts[role];
			if (
				typeof id !== 'string' ||
				!known.has(id) ||
				!(id === ordinaryCanon(role) || id.startsWith(`${ordinaryCanon(role)}-`)) ||
				(i === 0 && id !== ordinaryCanon(role))
			)
				throw new Error('invalid Canon body identity');
		}
	}
	if (
		value.masses.some(
			(mass, i, masses) =>
				typeof mass !== 'string' ||
				!mass ||
				mass === 'none' ||
				(i > 0 && String(masses[i - 1]) >= mass)
		)
	)
		throw new Error('invalid Canon Mass identities');
	const table = value as unknown as CanonTable;
	const rows = new Map<string, CanonProfile>();
	let previous = '';
	for (const row of table.pairs) {
		if (!Array.isArray(row) || row.length !== 3) throw new Error('invalid Canon pair');
		const [date, mass, profile] = row;
		if (
			!isCivilDate(date) ||
			!Number.isInteger(mass) ||
			mass < 0 ||
			mass >= table.masses.length ||
			!Number.isInteger(profile) ||
			profile < 0 ||
			profile >= table.profiles.length
		)
			throw new Error('invalid Canon pair');
		const key = `${date}/${table.masses[mass]}`;
		if (rows.has(key) || (previous && previous >= key))
			throw new Error('duplicate or unordered Canon pair');
		rows.set(key, table.profiles[profile]);
		previous = key;
	}
	return {
		profiles: table.profiles,
		resolve(date: string, mass: string): CanonProfile {
			const profile = rows.get(`${date}/${mass}`);
			if (!isCivilDate(date) || !profile) throw new Error('unsupported Canon choice');
			return profile;
		}
	};
}
function declaredLookup() {
	try {
		if (ROOT_MANIFEST.schema_version !== '5.9.0' || ROOT_MANIFEST.base.canon !== 'canon.json')
			throw new Error('undeclared Canon resource');
		return createCanonLookup(tableData);
	} catch {
		return null;
	}
}
export const canonLookup = declaredLookup();
export const CANON_VARIANTS = canonLookup
	? [
			...new Set(canonLookup.profiles.flatMap((p) => CANON_ROLES.map((role) => p.texts[role])))
		].filter((id) => !CANON_ROLES.some((role) => ordinaryCanon(role) === id))
	: [];

/** Narrow wire boundary over decoded corpus data; ordinary artifact gates own text parity. */
export function validateCanonPack(value: unknown, lang: Lang): CanonPack {
	if (
		!canonLookup ||
		!object(value) ||
		value.schema_version !== '1.0.0' ||
		value.lang !== lang ||
		!Array.isArray(value.parts) ||
		value.parts.length !== CANON_VARIANTS.length ||
		!object(value.lex) ||
		!object(value.lex.lemmata) ||
		!object(value.lex.senses)
	)
		throw new Error('invalid Canon pack');
	const seen = new Set<string>();
	for (const part of value.parts) {
		if (
			!object(part) ||
			typeof part.key !== 'string' ||
			!CANON_VARIANTS.includes(part.key.replace('/', '.')) ||
			seen.has(part.key) ||
			!hasText(part.key, lang) ||
			!isCanonRole(String(part.slot)) ||
			part.part !== part.slot ||
			!part.key.startsWith(`ordinarium/${part.slot}-`)
		)
			throw new Error('invalid Canon pack body');
		seen.add(part.key);
		if (
			!object(part.doc) ||
			part.doc.id !== part.key.replace('/', '.') ||
			!Array.isArray(part.doc.segments) ||
			!part.doc.segments.length ||
			!object(part.gloss) ||
			part.gloss.text !== part.doc.id ||
			part.gloss.lang !== lang ||
			!object(part.gloss.segments) ||
			!object(part.gloss.words) ||
			!object(part.bibliography) ||
			!Array.isArray(part.bibliography.context) ||
			!Array.isArray(part.bibliography.translation)
		)
			throw new Error('invalid Canon body data');
		let words = 0;
		for (const segment of part.doc.segments) {
			if (
				!object(segment) ||
				typeof segment.id !== 'string' ||
				!object(part.gloss.segments[segment.id])
			)
				throw new Error('incomplete Canon segments');
			if (segment.type === 'verse') {
				if (!Array.isArray(segment.words) || !segment.words.length)
					throw new Error('empty Canon body');
				for (const word of segment.words) {
					if (
						!object(word) ||
						typeof word.id !== 'string' ||
						typeof word.form !== 'string' ||
						!word.form ||
						typeof word.lemma !== 'string' ||
						!object(value.lex.lemmata[word.lemma]) ||
						!object(value.lex.senses[word.lemma]) ||
						!object(part.gloss.words[word.id])
					)
						throw new Error('incomplete Canon lexical data');
					words += 1;
				}
			}
		}
		if (!words) throw new Error('empty Canon body');
	}
	return value as unknown as CanonPack;
}

export function selectedCanon(profile: CanonProfile, pack: CanonPack | null): CanonBody[] {
	return CANON_ROLES.flatMap((role) => {
		const id = profile.texts[role];
		if (id === ordinaryCanon(role)) return [];
		const body = pack?.parts.find((part) => part.key === canonKey(id));
		if (!body || body.slot !== role) throw new Error('selected Canon body absent');
		return [body];
	});
}

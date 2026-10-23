// The reader owns the date/Mass table. This consumer does no calendar arithmetic.
import tableData from './data/canon.json';
import { ROOT_MANIFEST, TEXT_METADATA } from './corpus-metadata';
import type { Lang } from './i18n';
import {
	object,
	exactKeys,
	indexedChoices,
	validateVariantPack,
	type VariantBody,
	type VariantPack
} from './variant-resource';

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
export type CanonBody = VariantBody<CanonRole>;
export type CanonPack = VariantPack<CanonRole>;

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
		value.profiles.length !== PROFILE_IDS.length
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
	const profiles = value.profiles as CanonProfile[];
	return { profiles, resolve: indexedChoices(value.masses, profiles, value.pairs) };
}

function declaredLookup() {
	try {
		if (ROOT_MANIFEST.schema_version !== '6.1.0' || ROOT_MANIFEST.base.canon !== 'canon.json')
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
	if (!canonLookup) throw new Error('Canon resource unavailable');
	const expected = CANON_VARIANTS.map((id) => {
		const role = CANON_ROLES.find((role) => id.startsWith(`${ordinaryCanon(role)}-`));
		if (!role) throw new Error('invalid Canon body identity');
		return { key: canonKey(id), slot: role };
	});
	return validateVariantPack(value, lang, expected);
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

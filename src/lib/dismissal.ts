/** The corpus declares every supported choice; this reader does no computus. */
import tableData from './data/dismissal.json';
import { ROOT_MANIFEST, FORMULARY_METADATA, TEXT_METADATA } from './corpus-metadata';
import type { Lang } from './i18n';
import {
	object,
	exactKeys,
	indexedChoices,
	validateVariantPack,
	type VariantPack
} from './variant-resource';

export const DISMISSAL_ROLE = 'ite-missa-est';
export const ORDINARY_DISMISSAL = 'ordinarium.ite-missa-est';
export const PASCHAL_DISMISSAL = 'ordinarium.ite-missa-est-paschale';
export const REQUIEM_DISMISSAL = 'ordinarium.ite-missa-est-defunctorum';
export interface DismissalProfile {
	id: 'ordinary' | 'paschale' | 'defunctorum';
	text: string;
}
export type DismissalPack = VariantPack<typeof DISMISSAL_ROLE>;
const PROFILES: DismissalProfile[] = [
	{ id: 'ordinary', text: ORDINARY_DISMISSAL },
	{ id: 'paschale', text: PASCHAL_DISMISSAL },
	{ id: 'defunctorum', text: REQUIEM_DISMISSAL }
];

export function createDismissalLookup(
	value: unknown,
	knownTexts = new Set(TEXT_METADATA.map(({ id }) => id)),
	knownMasses = new Set(FORMULARY_METADATA.map(({ id }) => id))
) {
	if (
		!object(value) ||
		!exactKeys(value, ['schema_version', 'role', 'profiles', 'masses', 'pairs']) ||
		value.schema_version !== '1.1.0' ||
		value.role !== DISMISSAL_ROLE ||
		!Array.isArray(value.profiles) ||
		value.profiles.length !== PROFILES.length ||
		!Array.isArray(value.masses) ||
		value.masses.length !== knownMasses.size ||
		value.masses.some((mass) => typeof mass !== 'string' || !knownMasses.has(mass))
	)
		throw new Error('invalid dismissal resource');
	for (const [index, profile] of value.profiles.entries()) {
		const expected = PROFILES[index];
		if (
			!object(profile) ||
			!exactKeys(profile, ['id', 'text']) ||
			profile.id !== expected.id ||
			profile.text !== expected.text ||
			!knownTexts.has(expected.text)
		)
			throw new Error('invalid dismissal profile');
	}
	const profiles = value.profiles as DismissalProfile[];
	return { profiles, resolve: indexedChoices(value.masses, profiles, value.pairs) };
}

function declaredLookup() {
	try {
		if (
			ROOT_MANIFEST.schema_version !== '6.12.0' ||
			ROOT_MANIFEST.base.dismissal !== 'dismissal.json'
		)
			throw new Error('undeclared dismissal resource');
		return createDismissalLookup(tableData);
	} catch {
		return null;
	}
}
export const dismissalLookup = declaredLookup();
export const DISMISSAL_TEXT_KEYS =
	dismissalLookup?.profiles.map(({ text }) => text.replace('.', '/')) ?? [];

/** The shared pack contains every non-ordinary body, in profile order. */
export const replacementDismissals: { key: string; slot: typeof DISMISSAL_ROLE }[] = [
	PASCHAL_DISMISSAL,
	REQUIEM_DISMISSAL
].map((text) => ({
	key: text.replace('.', '/'),
	slot: DISMISSAL_ROLE
}));

export function validateDismissalPack(value: unknown, lang: Lang): DismissalPack {
	if (!dismissalLookup) throw new Error('dismissal resource unavailable');
	const pack = validateVariantPack(value, lang, replacementDismissals);
	const requiem = pack.parts.find((part) => part.doc.id === REQUIEM_DISMISSAL);
	if (!requiem?.gloss.about?.trim()) throw new Error('Requiem dismissal context absent');
	return pack;
}

export function selectedDismissal(profile: DismissalProfile, pack: DismissalPack | null) {
	if (profile.text === ORDINARY_DISMISSAL) return [];
	const body = pack?.parts.find((part) => part.key === profile.text.replace('.', '/'));
	if (!body || body.slot !== DISMISSAL_ROLE) throw new Error('selected dismissal body absent');
	return [body];
}

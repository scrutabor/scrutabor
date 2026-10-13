/** Shared wire checks for corpus-owned replacements of Ordinary texts. */
import { object, validateLocalizedBody } from './localized-body';
export { object } from './localized-body';
import { isCivilDate } from './kalendarium';
import type { Lang } from './i18n';
import type { TextDocument, GlossDocument, Lexicon } from './corpus';
import type { TextBibliographyEvidence } from './bibliography';

export function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	return (
		Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
	);
}

/** Validate finite decisions without recreating the corpus's calendar rules. */
export function indexedChoices<T>(masses: unknown, profiles: T[], pairs: unknown) {
	if (
		!Array.isArray(masses) ||
		!masses.length ||
		masses.some(
			(mass, index) =>
				typeof mass !== 'string' ||
				!mass ||
				mass === 'none' ||
				(index > 0 && String(masses[index - 1]) >= mass)
		) ||
		!profiles.length ||
		!Array.isArray(pairs) ||
		!pairs.length
	)
		throw new Error('invalid date/Mass indexes');
	const rows = new Map<string, T>();
	let previous = '';
	for (const row of pairs) {
		if (!Array.isArray(row) || row.length !== 3) throw new Error('invalid date/Mass pair');
		const [date, mass, profile] = row;
		if (
			!isCivilDate(date) ||
			!Number.isInteger(mass) ||
			mass < 0 ||
			mass >= masses.length ||
			!Number.isInteger(profile) ||
			profile < 0 ||
			profile >= profiles.length
		)
			throw new Error('invalid date/Mass pair');
		const key = `${date}/${masses[mass]}`;
		if (rows.has(key) || (previous && previous >= key))
			throw new Error('duplicate or unordered date/Mass pair');
		rows.set(key, profiles[profile]);
		previous = key;
	}
	return (date: string, mass: string): T => {
		const selected = rows.get(`${date}/${mass}`);
		if (!isCivilDate(date) || selected === undefined)
			throw new Error('unsupported date/Mass choice');
		return selected;
	};
}

export interface VariantBody<Role extends string = string> {
	key: string;
	part: Role;
	slot: Role;
	doc: TextDocument;
	gloss: GlossDocument;
	bibliography: TextBibliographyEvidence;
}

export interface VariantPack<Role extends string = string> {
	schema_version: string;
	lang: Lang;
	parts: VariantBody<Role>[];
	lex: Lexicon;
}

/** Complete localized bodies, lexical slice and bibliography for declared keys. */
export function validateVariantPack<Role extends string>(
	value: unknown,
	lang: Lang,
	expected: readonly { key: string; slot: Role }[]
): VariantPack<Role> {
	if (
		!expected.length ||
		new Set(expected.map(({ key }) => key)).size !== expected.length ||
		!object(value) ||
		value.schema_version !== '1.0.0' ||
		value.lang !== lang ||
		!Array.isArray(value.parts) ||
		value.parts.length !== expected.length ||
		!object(value.lex) ||
		!object(value.lex.lemmata) ||
		!object(value.lex.senses)
	)
		throw new Error('invalid variant pack');
	const seen = new Set<string>();
	for (const part of value.parts) {
		if (!object(part) || typeof part.key !== 'string') throw new Error('invalid variant body');
		const declaration = expected.find(({ key }) => key === part.key);
		if (
			!declaration ||
			seen.has(part.key) ||
			part.slot !== declaration.slot ||
			part.part !== declaration.slot
		)
			throw new Error('invalid variant body identity');
		seen.add(part.key);
		validateLocalizedBody(part, lang, value.lex);
	}
	return value as unknown as VariantPack<Role>;
}

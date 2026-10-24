import type { Lang } from './i18n';

export const COMMEMORATION_ABOUT_SLOTS = ['collecta', 'secreta', 'postcommunio'] as const;
export type CommemorationAboutSlot = (typeof COMMEMORATION_ABOUT_SLOTS)[number];
type AboutMap = Partial<Record<CommemorationAboutSlot, string>>;
interface Entry {
	title: string;
	about?: AboutMap;
}
interface NeutralEntry {
	id: string;
	slots: readonly { key: string; text: string | null }[];
}

const object = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

/** Localized context prose is deliberate, never inferred from a borrowed text's name.
 * Missing inherits; an explicit empty string suppresses; no other falsy value is admitted. */
export function localizedCommemorations(
	value: unknown,
	language: Lang,
	neutral: readonly NeutralEntry[]
) {
	if (
		!object(value) ||
		!exact(value, ['schema_version', 'language', 'titles']) ||
		value.schema_version !== '1.1.0' ||
		value.language !== language ||
		!Array.isArray(value.titles) ||
		value.titles.length !== neutral.length
	)
		throw new Error('invalid localized commemoration context contract');
	const owners = new Map(neutral.map((entry) => [entry.id, entry]));
	if (owners.size !== neutral.length || !owners.size)
		throw new Error('invalid neutral commemoration context identities');
	const entries = new Map<string, Entry>();
	for (const row of value.titles) {
		if (
			!object(row) ||
			!exact(row, Object.hasOwn(row, 'about') ? ['id', 'title', 'about'] : ['id', 'title']) ||
			typeof row.id !== 'string' ||
			!owners.has(row.id) ||
			entries.has(row.id) ||
			typeof row.title !== 'string' ||
			!row.title.trim()
		)
			throw new Error('invalid localized commemoration context entry');
		const entry: Entry = { title: row.title };
		if (Object.hasOwn(row, 'about')) {
			if (!object(row.about)) throw new Error('invalid commemoration about map');
			const allowed = new Set(
				owners
					.get(row.id)!
					.slots.filter((slot) => slot.text !== null)
					.map((slot) => slot.key)
			);
			const about: AboutMap = {};
			for (const [key, prose] of Object.entries(row.about)) {
				if (
					!(COMMEMORATION_ABOUT_SLOTS as readonly string[]).includes(key) ||
					!allowed.has(key) ||
					typeof prose !== 'string' ||
					(prose !== '' && !prose.trim())
				)
					throw new Error('invalid commemoration about slot or prose');
				about[key as CommemorationAboutSlot] = prose;
			}
			entry.about = about;
		}
		entries.set(row.id, entry);
	}
	function owner(id: string) {
		const entry = entries.get(id);
		if (!entry) throw new Error(`unknown localized commemoration ${id}`);
		return entry;
	}
	return {
		title: (id: string): string => owner(id).title,
		about: (id: string, slot: CommemorationAboutSlot): string | undefined => {
			const entry = owner(id);
			if (
				!(COMMEMORATION_ABOUT_SLOTS as readonly string[]).includes(slot) ||
				!owners.get(id)!.slots.some((part) => part.key === slot && part.text !== null)
			)
				throw new Error('unknown or calendar commemoration about slot');
			return entry.about?.[slot];
		}
	};
}

/** Closed neutral-catalogue prescriptions of Ordinary omissions. The catalogue that every page
 * reads validates them, so this module imports nothing at run time: the omission view and its
 * address handling stay out of the first visit. */

export interface OrdinarySegmentOmission {
	text: 'ordinarium/lavabo';
	segments: ['s09', 's10'];
	reason: 'lavabo-doxology';
}

export type WholeOrdinaryOmission =
	| { text: 'ordinarium/iudica-me'; reason: 'requiem-iudica' }
	| { text: 'ordinarium/qui-dixisti'; reason: 'requiem-peace-prayer' }
	| { text: 'ordinarium/benedictio'; reason: 'requiem-blessing' }
	| { text: 'ordinarium/qui-dixisti'; reason: 'triduum-peace-prayer' }
	| { text: 'ordinarium/agnus-dei'; reason: 'vigil-agnus-dei' };
export type OrdinaryOmissionDescriptor = OrdinarySegmentOmission | WholeOrdinaryOmission;

const REQUIEM = [
	{ text: 'ordinarium/iudica-me', reason: 'requiem-iudica' },
	{ text: 'ordinarium/qui-dixisti', reason: 'requiem-peace-prayer' },
	{ text: 'ordinarium/benedictio', reason: 'requiem-blessing' }
] as const;

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const LAVABO = {
	text: 'ordinarium/lavabo',
	segments: ['s09', 's10'],
	reason: 'lavabo-doxology'
} as const;
const TRIDUUM_PEACE = { text: 'ordinarium/qui-dixisti', reason: 'triduum-peace-prayer' } as const;
const ALTERNATIVES = [
	[],
	[LAVABO],
	[LAVABO, ...REQUIEM],
	[LAVABO, TRIDUUM_PEACE],
	[{ text: 'ordinarium/agnus-dei', reason: 'vigil-agnus-dei' }, TRIDUUM_PEACE]
] as const;

function sameRow(value: unknown, expected: Record<string, unknown>): boolean {
	if (!record(value) || Object.keys(value).length !== Object.keys(expected).length) return false;
	return Object.entries(expected).every(([key, wanted]) => {
		const got = value[key];
		return Array.isArray(wanted)
			? Array.isArray(got) &&
					got.length === wanted.length &&
					wanted.every((item, index) => got[index] === item)
			: got === wanted;
	});
}

/** Only the published ordered alternatives; no independent calendar rule or new combination. */
export function validateOrdinarySegmentOmissions(value: unknown): OrdinaryOmissionDescriptor[] {
	if (!Array.isArray(value)) throw new Error('invalid ordinary segment omissions');
	if (
		!ALTERNATIVES.some(
			(rows) =>
				rows.length === value.length && rows.every((row, index) => sameRow(value[index], row))
		)
	)
		throw new Error('invalid ordinary segment omission');
	return value as OrdinaryOmissionDescriptor[];
}

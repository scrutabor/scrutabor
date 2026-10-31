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
	| { text: 'ordinarium/benedictio'; reason: 'requiem-blessing' };
export type OrdinaryOmissionDescriptor = OrdinarySegmentOmission | WholeOrdinaryOmission;

const REQUIEM = [
	{ text: 'ordinarium/iudica-me', reason: 'requiem-iudica' },
	{ text: 'ordinarium/qui-dixisti', reason: 'requiem-peace-prayer' },
	{ text: 'ordinarium/benedictio', reason: 'requiem-blessing' }
] as const;

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Exact published alternatives: retention, Lavabo only, or the four Requiem rows. */
export function validateOrdinarySegmentOmissions(value: unknown): OrdinaryOmissionDescriptor[] {
	if (Array.isArray(value) && value.length === 4) {
		validateOrdinarySegmentOmissions(value.slice(0, 1));
		for (const [index, expected] of REQUIEM.entries()) {
			const row: unknown = value[index + 1];
			if (
				!record(row) ||
				Object.keys(row).length !== 2 ||
				row.text !== expected.text ||
				row.reason !== expected.reason
			)
				throw new Error('invalid ordinary segment omission');
		}
		return value as OrdinaryOmissionDescriptor[];
	}
	if (!Array.isArray(value) || value.length > 1)
		throw new Error('invalid ordinary segment omissions');
	for (const row of value) {
		if (
			!record(row) ||
			Object.keys(row).length !== 3 ||
			row.text !== 'ordinarium/lavabo' ||
			row.reason !== 'lavabo-doxology' ||
			!Array.isArray(row.segments) ||
			row.segments.length !== 2 ||
			row.segments[0] !== 's09' ||
			row.segments[1] !== 's10'
		)
			throw new Error('invalid ordinary segment omission');
	}
	return value as OrdinarySegmentOmission[];
}

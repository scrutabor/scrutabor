/** The neutral catalogue owns every prescription; this module only checks its wire shape. */
export const ORDINARY_PARTS = ['gloria', 'credo'] as const;
export type ConditionalOrdinary = (typeof ORDINARY_PARTS)[number];
export type OrdinaryState = 'required' | 'omitted' | 'unresolved';
export type OrdinaryBranches = Record<'sunday' | 'not-sunday', OrdinaryState>;
export type OrdinaryPrescriptions = Record<ConditionalOrdinary, OrdinaryBranches>;

function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.keys(value).length === keys.length &&
		keys.every((key) => Object.hasOwn(value, key))
	);
}

/** Missing, malformed or additional branches never turn into a liturgical default. */
export function validateOrdinaryPrescriptions(value: unknown): OrdinaryPrescriptions {
	if (!exactRecord(value, ORDINARY_PARTS)) throw new Error('invalid Ordinary prescriptions');
	for (const part of ORDINARY_PARTS) {
		const branches = value[part];
		if (!exactRecord(branches, ['sunday', 'not-sunday']))
			throw new Error('invalid Ordinary branches');
		for (const state of Object.values(branches)) {
			if (state !== 'required' && state !== 'omitted' && state !== 'unresolved')
				throw new Error('invalid Ordinary prescription');
		}
	}
	return value as OrdinaryPrescriptions;
}

/** The caller establishes the real occurrence before selecting its explicit branch. */
export function ordinaryStateFor(
	prescriptions: OrdinaryPrescriptions,
	part: ConditionalOrdinary,
	sunday: boolean
): OrdinaryState {
	return prescriptions[part][sunday ? 'sunday' : 'not-sunday'];
}

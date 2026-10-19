import { expect, it } from 'vitest';
import { FORMULARY_METADATA, CORPUS_METRICS } from './corpus-metadata';
import { PROPER_DAYS } from './proprium';
import { ordinaryStateFor, validateOrdinaryPrescriptions } from './ordinary-prescriptions';

const rule = () => ({
	gloria: { sunday: 'required', 'not-sunday': 'unresolved' },
	credo: { sunday: 'required', 'not-sunday': 'omitted' }
});

it('preserves every real neutral prescription in the ProperDay projection', () => {
	expect(FORMULARY_METADATA.length).toBeGreaterThan(0);
	expect(FORMULARY_METADATA.length).toBe(CORPUS_METRICS.formularies.total);
	expect(PROPER_DAYS).toHaveLength(FORMULARY_METADATA.length);
	for (const form of FORMULARY_METADATA) {
		const checked = validateOrdinaryPrescriptions(form.ordinary);
		expect(checked).toBe(form.ordinary);
		expect(PROPER_DAYS.find((day) => day.id === form.id)?.ordinary).toEqual(checked);
	}
});

it.each(['required', 'omitted', 'unresolved'] as const)(
	'selects the explicit weekday %s without a general Sunday override',
	(state) => {
		const value = rule();
		value.gloria['not-sunday'] = state;
		const checked = validateOrdinaryPrescriptions(value);
		expect(ordinaryStateFor(checked, 'gloria', false)).toBe(state);
		expect(ordinaryStateFor(checked, 'gloria', true)).toBe('required');
		expect(ordinaryStateFor(checked, 'credo', false)).toBe('omitted');
	}
);

it.each([
	['absent', undefined],
	['null', null],
	['array', []],
	['empty', {}],
	['missing part', { gloria: rule().gloria }],
	['extra part', { ...rule(), sanctus: rule().gloria }],
	['missing branch', { ...rule(), gloria: { sunday: 'required' } }],
	['extra branch', { ...rule(), gloria: { ...rule().gloria, monday: 'required' } }],
	['branch array', { ...rule(), gloria: ['required', 'required'] }],
	['boolean', { ...rule(), gloria: { ...rule().gloria, sunday: true } }],
	['number', { ...rule(), credo: { ...rule().credo, sunday: 1 } }],
	['unknown state', { ...rule(), credo: { ...rule().credo, sunday: 'optional' } }]
])('rejects %s instead of filling a missing decision', (_, value) => {
	expect(() => validateOrdinaryPrescriptions(value)).toThrow(/invalid Ordinary/);
});

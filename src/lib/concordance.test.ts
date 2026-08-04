import { describe, expect, it } from 'vitest';
import { occurrencesOf } from './concordance';

describe('occurrencesOf', () => {
	it('groups occurrences by text in catalog order', () => {
		const oro = occurrencesOf('oro');
		expect(oro.map((t) => t.textKey)).toEqual(['orationes/ave-maria', 'ordinarium/confiteor']);
		expect(oro[0].items.map((o) => o.form)).toEqual(['ora']);
		expect(oro[1].items.map((o) => o.form)).toEqual(['oráre']);
	});

	it('lists every form of a lemma with its word id', () => {
		const deus = occurrencesOf('deus');
		const confiteor = deus.find((t) => t.textKey === 'ordinarium/confiteor');
		expect(confiteor?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ wordId: 'w002', form: 'Deo' }),
				expect.objectContaining({ wordId: 'w065', form: 'Deum' })
			])
		);
	});

	it('returns an empty list for an unknown lemma', () => {
		expect(occurrencesOf('nonexistent')).toEqual([]);
	});

	it('covers every lemma of every text', () => {
		// The index is derived from the same snapshot as the reading view —
		// a lemma with zero occurrences would mean the derivation dropped it.
		expect(occurrencesOf('et').length).toBeGreaterThan(0);
	});
});

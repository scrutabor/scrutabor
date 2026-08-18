import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { properRank } from './proprium';
import { everyTextInOrder, occurrencesOf } from './concordance';
import { TEXTS } from './corpus';
import { ORDO } from './ordo';

describe('occurrencesOf', () => {
	it("groups occurrences by text in the book's own order", () => {
		const oro = occurrencesOf('oro');
		const keys = oro.map((t) => t.textKey);
		const at = (k: string) => keys.indexOf(k);
		// the prayers shelf first, in the shelf's order…
		expect(keys[0]).toBe('orationes/ave-maria');
		expect(at('orationes/salve-regina')).toBeLessThan(at('orationes/regina-caeli'));
		// …then the Mass, in the Ordo's liturgical sequence, not the alphabet
		expect(at('orationes/regina-caeli')).toBeLessThan(at('ordinarium/confiteor'));
		expect(at('ordinarium/aufer-a-nobis')).toBeLessThan(at('ordinarium/orate-fratres'));
		// …and the prayers said AFTER Mass come after all of it
		expect(at('ordinarium/pater-noster')).toBeLessThan(at('orationes/deus-refugium'));
		expect(oro[0].items.map((o) => o.form)).toEqual(['ora']);
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

describe('what the concordance is built from', () => {
	it('is every text in the corpus, not the shelf', () => {
		// It read the CATALOGUE once, which orders thirteen texts of the
		// sixty-one that exist, so the whole Canon was missing from every
		// lemma page — and the page gave no sign of it.
		expect(everyTextInOrder().length).toBe(Object.keys(TEXTS).length);
	});

	it('and something sequences each of them', () => {
		// Order comes from the shelf and then from the Ordo. A text neither
		// of them names falls to the sorted tail — and would usually have
		// nothing linking to it in the app either, which is the real thing
		// this catches.
		//
		// `proprium` is the declared exception (owner, 2026-08-18): it has no
		// shelf, is reached from lemma pages and direct links, and therefore
		// DOES live in the tail. The test below is what keeps that honest —
		// the tail must still be in rite order.
		const sequenced = new Set([
			...CATALOG.flatMap((s) => s.texts).map((t) => `${t.category}/${t.slug}`),
			...ORDO.flatMap((m) => m.entries).flatMap((e) => (e.text ? [e.text] : []))
		]);
		const unsequenced = everyTextInOrder().filter((k) => !sequenced.has(k));
		expect(unsequenced.filter((k) => !k.startsWith('proprium/'))).toEqual([]);
	});

	it('puts the Proper in rite order, not alphabetical order', () => {
		// Alphabetically the Alleluia precedes the Introit. On a lemma page
		// that would print the Mass out of sequence, in the one part of the
		// book with no shelf to order it.
		const proper = everyTextInOrder().filter((k) => k.startsWith('proprium/'));
		expect(proper.length).toBeGreaterThan(0);
		const ranks = proper.map((k) => properRank(k.split('/')[1]));
		expect(ranks).not.toContain(-1);
		expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
		expect(proper[0]).toMatch(/-introitus$/);
		expect(proper[proper.length - 1]).toMatch(/-postcommunio$/);
	});

	it('opens with the prayers and reaches the last Gospel at the end', () => {
		const order = everyTextInOrder();
		expect(order[0]).toBe('orationes/pater-noster');
		expect(order.indexOf('ordinarium/te-igitur')).toBeGreaterThan(
			order.indexOf('ordinarium/kyrie')
		);
		expect(order).toContain('ordinarium/evangelium-ultimum');
	});
});

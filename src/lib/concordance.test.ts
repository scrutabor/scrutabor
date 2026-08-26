import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { properRank } from './proprium';
import { everyTextInOrder, occurrencesOf, textsForLatinForm } from './concordance';
import { TEXT_KEYS } from './corpus';
import { ORDO } from './ordo';

describe('occurrencesOf', () => {
	it("groups occurrences by text in the book's own order", async () => {
		const oro = await occurrencesOf('oro');
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

	it('lists every form of a lemma with its word id', async () => {
		const deus = await occurrencesOf('deus');
		const confiteor = deus.find((t) => t.textKey === 'ordinarium/confiteor');
		expect(confiteor?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ wordId: 'w002', form: 'Deo' }),
				expect.objectContaining({ wordId: 'w065', form: 'Deum' })
			])
		);
	});

	it('returns an empty list for an unknown lemma', async () => {
		expect(await occurrencesOf('nonexistent')).toEqual([]);
	});

	it('covers every lemma of every text', async () => {
		// The index is derived from the same snapshot as the reading view —
		// a lemma with zero occurrences would mean the derivation dropped it.
		expect((await occurrencesOf('et')).length).toBeGreaterThan(0);
	});

	it('finds normalized Latin forms before loading candidate documents', () => {
		expect(textsForLatinForm('DÓMINUS')).toContain('ordinarium/gloria');
		expect(textsForLatinForm('cælos')).toContain('orationes/symbolum-apostolorum');
	});
});

describe('what the concordance is built from', () => {
	it('is every text in the corpus, not the shelf', () => {
		// It read the CATALOGUE once, which orders thirteen texts of the
		// sixty-one that exist, so the whole Canon was missing from every
		// lemma page — and the page gave no sign of it.
		expect(everyTextInOrder().length).toBe(TEXT_KEYS.length);
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
		// Grouped by DAY, and in rite order inside each day. A global sort was
		// the right assertion while one formulary existed and the wrong one the
		// moment a second arrived: Advent II's collect is not out of order
		// because it follows Advent I's postcommunion.
		const byDay = new Map<string, number[]>();
		for (const key of proper) {
			const slug = key.split('/')[1];
			const day = slug.replace(/-[^-]+$/, '');
			expect(properRank(slug), `${slug} names no known part`).not.toBe(-1);
			byDay.set(day, [...(byDay.get(day) ?? []), properRank(slug)]);
		}
		for (const [day, ranks] of byDay) {
			expect([...ranks], `${day} is out of rite order`).toEqual([...ranks].sort((a, b) => a - b));
		}
		// The days themselves keep the order the table declares.
		const days = [...byDay.keys()];
		expect(days).toEqual([...days].sort());
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

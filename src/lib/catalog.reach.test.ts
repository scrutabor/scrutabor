import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { TEXTS } from './corpus';
import { ORDO } from './ordo';

// A vendored text a reader cannot reach is data shipped for nobody, and a
// catalogue entry with no text behind it is a dead link. The vendor script
// keeps the Proper out of `lib/data` on purpose, because there is no route
// for it yet — this test is what makes that decision hold: vendor the Proper
// without giving it a shelf and the suite says so, instead of the reader
// finding out.
describe('every vendored text is reachable, and every named text exists', () => {
	const shelved = new Set(CATALOG.flatMap((s) => s.texts.map((t) => `${t.category}/${t.slug}`)));
	const inOrdo = new Set(
		ORDO.flatMap((m) => m.entries)
			.map((e) => e.text)
			.filter((k): k is string => Boolean(k))
	);

	it('shelves or walks past every text in the data', () => {
		for (const key of Object.keys(TEXTS)) {
			expect(shelved.has(key) || inOrdo.has(key), `${key} is on no shelf and in no movement`).toBe(
				true
			);
		}
	});

	it('names no text it does not have', () => {
		for (const key of [...shelved, ...inOrdo]) {
			expect(TEXTS[key], `${key} is named but not vendored`).toBeDefined();
		}
	});
});

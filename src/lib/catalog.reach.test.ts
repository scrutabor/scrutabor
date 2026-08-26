import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { TEXT_KEYS, hasText } from './corpus';
import { ORDO } from './ordo';

// A vendored text a reader cannot reach is data shipped for nobody, and a
// catalogue entry with no text behind it is a dead link.
//
// One category is deliberately reachable WITHOUT a shelf. The Proper's parts
// are not listed anywhere in the menu (owner, 2026-08-18): ten cards read fine
// for one Sunday and would be five hundred for the year, and the answer is to
// fill the Ordo's own `z formularza dnia` slots from a day the reader picks.
// Until that lands the parts are reached from lemma pages — 173 of them link
// in — and by direct link, and both are real paths.
//
// That exemption is DECLARED here rather than granted by weakening the rule,
// and it is checked from both sides: a category in the list that turns out to
// be shelved after all is also an error, because a stale exemption is how a
// rule quietly stops applying.
describe('every vendored text is reachable, and every named text exists', () => {
	const shelved = new Set(CATALOG.flatMap((s) => s.texts.map((t) => `${t.category}/${t.slug}`)));
	const inOrdo = new Set(
		ORDO.flatMap((m) => m.entries)
			.map((e) => e.text)
			.filter((k): k is string => Boolean(k))
	);

	// Reached by lemma pages and direct links instead of by a shelf.
	const UNSHELVED = new Set(['proprium']);

	it('shelves or walks past every text in the data', () => {
		for (const key of TEXT_KEYS) {
			if (UNSHELVED.has(key.split('/')[0])) continue;
			expect(shelved.has(key) || inOrdo.has(key), `${key} is on no shelf and in no movement`).toBe(
				true
			);
		}
	});

	it('keeps no exemption it no longer needs', () => {
		for (const category of UNSHELVED) {
			const onAShelf = [...shelved].filter((key) => key.startsWith(`${category}/`));
			expect(onAShelf, `${category} is exempted from needing a shelf but has one`).toEqual([]);
		}
		// And the exemption must name something real, or it is a comment.
		for (const category of UNSHELVED) {
			const vendored = TEXT_KEYS.filter((key) => key.startsWith(`${category}/`));
			expect(vendored.length, `${category} is exempted but nothing is vendored`).toBeGreaterThan(0);
		}
	});

	it('names no text it does not have', () => {
		for (const key of [...shelved, ...inOrdo]) {
			expect(hasText(key), `${key} is named but not vendored`).toBe(true);
		}
	});
});

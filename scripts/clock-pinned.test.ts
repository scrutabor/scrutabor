// No test of the day picker may run on the wall clock.
//
// The book opens on today, so what the picker shows depends on the date the
// machine happens to hold. One test in tests/proprium.spec.ts was left
// unpinned and would have gone red on 2026-11-29 and every Advent Sunday
// after it — during the season the book is most used, with a failure that
// clears by Monday. Nothing caught it because a test that passes today looks
// exactly like a test that is correct.
//
// This reads the spec's own source rather than running it: the defect is the
// absence of a call, and an absence is visible in the text and invisible at
// runtime for eleven months of the year.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SPEC = 'tests/proprium.spec.ts';
const source = readFileSync(SPEC, 'utf8');

/** Each `test('…', …)` body in the file, with its title. */
function tests(): { title: string; body: string }[] {
	const found: { title: string; body: string }[] = [];
	const opener = /^test\((['"`])(.+?)\1/gm;
	let match: RegExpExecArray | null;
	while ((match = opener.exec(source))) {
		const next = source.slice(match.index + 1).search(/^test\(/m);
		const body =
			next < 0 ? source.slice(match.index) : source.slice(match.index, match.index + 1 + next);
		found.push({ title: match[2], body });
	}
	return found;
}

describe('the day picker specs', () => {
	it('finds the tests it means to check', () => {
		const all = tests();
		expect(all.length, 'the parser lost the file').toBeGreaterThan(8);
		expect(all.map((t) => t.title)).toContain('the Ordo shows placeholders until a day is chosen');
	});

	it('pins the clock in every test that opens a page', () => {
		const unpinned = tests()
			.filter((t) => t.body.includes('page.goto('))
			.filter((t) => !t.body.includes('asIfItWere('))
			.map((t) => t.title);
		expect(
			unpinned,
			`these run on the wall clock and will change behaviour with the season:\n  ${unpinned.join('\n  ')}`
		).toEqual([]);
	});
});

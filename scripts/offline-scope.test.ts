import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The day's texts belong to the BOOK, never to the shell (owner, 2026-08-18;
// decisions #27 as revised). A reader who opened one prayer in a browser has
// not asked for the propers of the year, and the whole point of fetching a day
// instead of prerendering it is undone if every visitor downloads all of them
// at install.
//
// This reads the worker's source rather than its behaviour, which is a weaker
// test than running it — but the alternative is no test at all for the one
// decision that made this design worth building, and the source is where the
// mistake would be made.
const sw = readFileSync('src/service-worker.ts', 'utf8');

describe('what an install downloads', () => {
	it('keeps the day artifacts out of the shell', () => {
		// The slice's own footing first: with `const DAYS` declared ABOVE
		// `const SHELL` — an ordinary readability reshuffle — the end index
		// precedes the start, the slice is '', and `expect('').not.toContain`
		// passes on a worker doing exactly what this test forbids. A
		// source-reading gate has to prove it read something.
		const start = sw.indexOf('const SHELL =');
		const end = sw.indexOf('const DAYS');
		expect(start, 'SHELL declaration found').toBeGreaterThanOrEqual(0);
		expect(end, 'DAYS declared after SHELL').toBeGreaterThan(start);
		const shell = sw.slice(start, end);
		expect(shell).toContain('SHELL');
		expect(shell).not.toContain('artifacts');
	});

	it('puts them in the book', () => {
		const everything = sw.slice(sw.indexOf('const EVERYTHING'));
		const block = everything.slice(0, everything.indexOf('];') + 2);
		expect(block).toContain('DAYS');
	});

	it('selects them by the path the endpoint actually serves', () => {
		// If the route moves and this filter does not, DAYS silently becomes
		// empty and the installed app loses every day without failing.
		expect(sw).toContain("startsWith('/artifacts/proprium/')");
	});
});

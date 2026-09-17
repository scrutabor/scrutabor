import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { editionLists } from '../src/lib/service-worker-edition';

// The day's texts belong to the BOOK, never to the shell (owner, 2026-08-18;
// decisions #27 as revised). A reader who opened one prayer in a browser has
// not asked for the propers of the year, and the whole point of fetching a day
// instead of prerendering it is undone if every visitor downloads all of them
// at install.
//
// The lists are derived by $lib/service-worker-edition from a manifest, so
// the decision is tested by running it. The one thing left to read from the
// worker's source is that the worker asks that module and nothing else.
const lists = editionLists({
	build: ['/_app/immutable/entry/app.js', '/_app/immutable/corpus/corpus-texts.js'],
	files: ['/manifest.webmanifest'],
	prerendered: [
		'/app/',
		'/app/pl',
		'/app/pl/ordo',
		'/app/pl/ordinarium/credo',
		'/artifacts/proprium/pl/pack-01.json',
		'/artifacts/proprium/en/pack-01.json'
	]
});

describe('what an install downloads', () => {
	it('keeps the day artifacts out of the shell', () => {
		expect(lists.shell.some((path) => path.includes('artifacts'))).toBe(false);
		expect(lists.shell).toContain('/app/pl/ordo');
	});

	it('puts them in the book', () => {
		expect(lists.everything).toEqual(expect.arrayContaining(lists.days));
		expect(lists.days).toHaveLength(2);
	});

	it('selects them by the path the endpoint actually serves', () => {
		// If the route moves and this filter does not, the days silently
		// become empty and the installed app loses every day without failing.
		expect(lists.days).toEqual([
			'/artifacts/proprium/pl/pack-01.json',
			'/artifacts/proprium/en/pack-01.json'
		]);
	});

	it('is what the worker itself uses', () => {
		const sw = readFileSync('src/service-worker.ts', 'utf8');
		expect(sw).toContain("from '$lib/service-worker-edition'");
		expect(sw).toMatch(/const \{[^}]*everything: EVERYTHING[^}]*\} = editionLists\(/);
		// No list may be rebuilt from the raw manifest beside the helper.
		expect(sw).not.toMatch(/prerendered\.filter/);
		expect(sw).not.toMatch(/build\.filter/);
	});
});

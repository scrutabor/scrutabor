// Every route the site has, the downloaded copy has too.
//
// The site's routes are directories under src/routes/app and SvelteKit finds
// them by walking the tree. The copy is one document with a table of patterns
// (offline/routes.ts), and a table is a list somebody maintains — so a route
// added on the site and forgotten there would simply not exist in the folder,
// and nothing would say so: the link would render, the hash would change, and
// the reader would get a 404 inside their own book.
//
// This walks the same tree the framework does and holds the two against each
// other. It lives in scripts/ because it reads the filesystem, and `node:fs`
// under src/ type-checks locally and fails on CI.
import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { match, pageData, ROUTES } from '../offline/routes';

const ROOT = 'src/routes/app';

/** SvelteKit's own route ids for every page under /app. */
function siteRoutes(): string[] {
	const found: string[] = [];
	const walk = (dir: string, id: string) => {
		const names = readdirSync(dir);
		if (names.includes('+page.svelte')) found.push(id);
		for (const name of names) {
			const path = `${dir}/${name}`;
			// Route groups and parameter directories are part of the id; only
			// the +files are not, and those are not directories.
			if (statSync(path).isDirectory()) walk(path, `${id}/${name}`);
		}
	};
	walk(ROOT, '/app');
	return found.sort();
}

/**
 * The one route the folder answers differently, and why.
 *
 * `/app` is the language chooser: a page whose whole body is a script that
 * reads the stored choice and redirects. The copy does the same thing in its
 * router, for the empty hash, so there is nothing for the table to name.
 */
const ANSWERED_BY_THE_ROUTER = ['/app'];

describe('the downloaded copy covers the whole site', () => {
	it('decodes a route parameter exactly once', async () => {
		const found = match('/pl/lemma/Clemens%25');
		expect(found?.params.lemma).toBe('Clemens%');
		await expect(pageData(found!)).resolves.toBeNull();
	});

	it('has a pattern for every route under /app', () => {
		const covered = new Set([...ROUTES.map((r) => r.key), ...ANSWERED_BY_THE_ROUTER]);
		const missing = siteRoutes().filter((id) => !covered.has(id));
		expect(
			missing,
			'add these to offline/routes.ts, or the folder edition will 404 on them'
		).toEqual([]);
	});

	it('names no route the site does not have', () => {
		const real = new Set(siteRoutes());
		expect(ROUTES.map((r) => r.key).filter((key) => !real.has(key))).toEqual([]);
	});

	it('matches each route with the pattern that belongs to it', () => {
		// The order in the table is load-bearing: `/:lang/:category/:slug`
		// would swallow every other three-part address in the book.
		const cases: [string, string][] = [
			['/pl', 'home'],
			['/pl/search', 'search'],
			['/en/ordo', 'ordo'],
			['/pl/ordo/canon', 'movement'],
			['/pl/grammatica', 'grammatica'],
			['/pl/grammatica/pronuntiatio', 'pronuntiatio'],
			['/pl/grammatica/vocativus', 'concept'],
			['/pl/lemma/dominus', 'lemma'],
			['/pl/bibliographia', 'bibliographia'],
			['/pl/editio', 'editio'],
			['/pl/orationes/pater-noster', 'reading']
		];
		for (const [path, name] of cases) {
			const hit = ROUTES.find((r) => r.pattern.test(path));
			expect(hit?.name, path).toBe(name);
		}
	});
});

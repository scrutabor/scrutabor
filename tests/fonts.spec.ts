// The reading face is a subset: it carries the characters this edition
// sets and no others (scripts/subset-fonts.py). That is worth 288K on
// every page load, and it fails silently — a character outside the subset
// falls back to a system serif, which on one word of one prayer is
// exactly the kind of thing nobody notices until a reader does.
//
// So the character set is committed next to the fonts, and this is the
// guard: nothing the server serves may need a character the subsets do
// not carry. When it fails, regenerate — the message says how.
import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { CHARSET } from '../src/lib/fonts/charset';

/** Every path the site serves, plus the one the sitemap leaves out. */
async function everyPage(request: APIRequestContext): Promise<string[]> {
	const sitemap = await (await request.get('/sitemap.xml')).text();
	const paths = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(
		(m) => m[1] || '/'
	);
	return [...paths, '/pl/404', '/en/404'];
}

test('nothing served needs a character the font subsets lack', async ({ request }) => {
	test.setTimeout(120_000);

	const declared = new Set(CHARSET);
	const needed = new Map<string, string>();
	const assets = new Set<string>();

	// Prerendered pages reference their assets relatively (../../_app/…),
	// so every reference is resolved against the page that made it.
	const read = async (path: string) => {
		const body = await (await request.get(path)).text();
		for (const c of body) if (c.codePointAt(0)! > 0x1f && !declared.has(c)) needed.set(c, path);
		// Scripts and stylesheets carry text too: a label rendered only
		// after hydration is still text on the page.
		for (const m of body.matchAll(/["'(]([^"')]*_app\/[^"')]+\.(?:js|css))["')]/g)) {
			assets.add(new URL(m[1], `http://localhost${path}`).pathname);
		}
	};

	const pages = await everyPage(request);
	expect(pages.length).toBeGreaterThan(150);
	for (let i = 0; i < pages.length; i += 12) {
		await Promise.all(pages.slice(i, i + 12).map(read));
	}
	for (const asset of assets) await read(asset);
	expect(assets.size).toBeGreaterThan(10);

	expect(
		[...needed].map(
			([c, where]) =>
				`${c} (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}) on ${where}`
		),
		'regenerate the subsets with scripts/subset-fonts.py'
	).toEqual([]);
});

test('the reading face stays small', async ({ request }) => {
	// Follow the CSS to the faces, so this measures what a browser would
	// actually be asked to download.
	const home = await (await request.get('/en')).text();
	const sheets = [...home.matchAll(/["'(]([^"')]*_app\/[^"')]+\.css)["')]/g)].map(
		(m) => new URL(m[1], 'http://localhost/en').pathname
	);
	const faces = new Set<string>();
	for (const sheet of sheets) {
		const css = await (await request.get(sheet)).text();
		for (const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)) {
			faces.add(new URL(m[1].replace(/["']/g, ''), `http://localhost${sheet}`).pathname);
		}
	}
	// Eight: latin, latin-ext, greek and greek-ext, roman and italic.
	expect(faces.size).toBe(8);

	let total = 0;
	for (const face of faces) total += (await (await request.get(face)).body()).length;
	// Upstream is 480K across fourteen files. A regeneration that quietly
	// stopped subsetting would sail past every other test in this suite.
	expect(
		Math.round(total / 1024),
		'font subsets have grown — did a regeneration lose its charset?'
	).toBeLessThan(140);
});

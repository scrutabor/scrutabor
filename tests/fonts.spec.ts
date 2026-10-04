// The reading face is a subset: it carries the characters this edition
// sets and no others (scripts/subset-fonts.py). That is worth 288K on
// every page load, and it fails silently — a character outside the subset
// falls back to a system serif, which on one word of one prayer is
// exactly the kind of thing nobody notices until a reader does.
//
// So the character set is committed next to the fonts, and this is the
// guard: nothing the server serves may need a character the subsets do
// not carry. When it fails, regenerate — the message says how.
import { expect, test } from './fixtures';
import { CHARSET } from '../src/lib/fonts/charset';
import { checkedText, fontInventory } from '../scripts/font-inventory';

// Request-only checks run once against the deployed static tree. The
// physical Latin shaping check below still runs in each browser engine.
test('nothing served needs a character the font subsets lack @online @static-host', async ({
	request
}) => {
	test.setTimeout(120_000);
	const inventory = await fontInventory(request, new Set(CHARSET));
	expect(inventory.documents.length).toBeGreaterThan(150);
	expect(inventory.assets.length).toBeGreaterThan(10);
	expect(
		inventory.needed.map(
			([c, where]) =>
				`${c} (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}) on ${where}`
		),
		'regenerate the subsets with scripts/subset-fonts.py'
	).toEqual([]);
});

test('the reading face stays small @online @static-host', async ({ request }) => {
	// Follow the CSS to the faces, so this measures what a browser would
	// actually be asked to download.
	const home = await checkedText(request, '/en', 200, 'html');
	const sheets = [...home.matchAll(/["'(]([^"')]*_app\/[^"')]+\.css)["')]/g)].map(
		(m) => new URL(m[1], 'http://localhost/en').pathname
	);
	const faces = new Set<string>();
	for (const sheet of sheets) {
		const css = await checkedText(request, sheet, 200, 'css');
		for (const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)) {
			faces.add(new URL(m[1].replace(/["']/g, ''), `http://localhost${sheet}`).pathname);
		}
	}
	// Four: latin, latin-ext, greek and greek-ext — roman only, since the
	// book sets no italic anywhere (owner, 2026-08-21; the no-italics rule
	// in app.css carries the reasons).
	expect(faces.size).toBe(4);

	let total = 0;
	for (const face of faces) {
		const response = await request.get(face);
		expect(response.status(), face).toBe(200);
		expect(response.headers()['content-type'], face).toMatch(/^font\/woff2(?:;|$)/);
		total += (await response.body()).length;
	}
	// Upstream is 480K across fourteen files; the four roman subsets are
	// 55K. A regeneration that quietly stopped subsetting — or that let
	// the italic faces back in — would sail past every other test here.
	expect(
		Math.round(total / 1024),
		'font subsets have grown — did a regeneration lose its charset?'
	).toBeLessThan(70);
});

test('Latin text still refuses the locl substitution @online @reader', async ({ page }) => {
	// EB Garamond's roman carries an OpenType locl rule for the Latin
	// language system that swaps u for v — "qvia", "cvlpa" — and lang="la"
	// triggers it. The 1962 orthography distinguishes the two letters, so
	// the feature is off. This is a font-level trap that no charset check
	// would catch. The subsets must omit the Latin-language rule as well:
	// some shaping engines apply it even when computed CSS says locl=0.
	await page.goto('/app/pl/ordinarium/gloria');
	const applied = await page.evaluate(() => {
		const latin = document.querySelector('[lang="la"], .verse');
		return latin ? getComputedStyle(latin).fontFeatureSettings : 'none';
	});
	expect(applied).toContain('locl');
	expect(applied).toMatch(/locl["']?\s*0/);

	// and the rendered result: with the substitution live, u and v would
	// be drawn with the same glyph and measure the same
	const same = await page.evaluate(() => {
		const probe = (text: string) => {
			const s = document.createElement('span');
			s.lang = 'la';
			s.style.cssText = 'position:absolute;visibility:hidden;font-size:64px';
			s.textContent = text;
			document.body.appendChild(s);
			const w = s.getBoundingClientRect().width;
			s.remove();
			return w;
		};
		return Math.abs(probe('uuuu') - probe('vvvv')) < 1;
	});
	expect(same, 'u and v are being drawn as the same glyph').toBe(false);
});

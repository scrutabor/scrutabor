// Every interaction test needs the page to be hydrated, not merely rendered:
// the prerendered HTML carries the words long before the handlers exist, so a
// click can land on nothing. This wraps goto to wait for the marker the root
// layout sets, which removes a whole class of flake.
//
// And it waits for the FONT. Half this suite measures typography — the
// clearance between a word and its gloss, how many characters of prose fit a
// line, where a raised initial's ink falls — and every one of those numbers
// is a number about EB Garamond. Measured before the face arrives they are
// numbers about the fallback instead, and the two do not agree: the prose
// measure came out 69 characters on one machine and 81 on another, and the
// clearance that is half a pixel here was zero there. It cost five red
// builds on main. Fonts first, then measure.
//
// THE SAME SPECS RUN TWICE. The `offline` project points them at
// build-offline/ over file://, where the book has no server and no origin.
// Four bugs reached that edition while lint, types and every test were green
// — the Ordo index asking a router that was not there, a panel that walked
// back out of the prayer when closed, a stylesheet looked for one directory
// too high, a 404 that answered a Polish reader in English — and every one
// of them would have been caught here. A path is translated to the address
// the folder keeps it at: /pl/orationes/ave-maria becomes
// index.html#/pl/orationes/ave-maria, and the query rides along.
import { test as base, expect } from '@playwright/test';

/** A site path as it is addressed in the downloaded folder. The project root
 * comes from Playwright's own config file — `rootDir` is the TEST
 * directory, which is one level too deep — so this file needs no node
 * types to find it.
 *
 * The folder is ONE document and the route is its hash: the whole book
 * renders from the corpus the runtime carries, so /app/pl/x/y is
 * index.html#/pl/x/y. Only the book is in the folder — the landing pages at
 * the origin root are deliberately not packaged, so a test that asks for one
 * offline is asking for the wrong artifact, loudly rather than by opening
 * some other file. */
export function offlineUrl(root: string, path: string): string {
	const [, route = '/', query = ''] = /^([^?#]*)([?#].*)?$/.exec(path) ?? [];
	const base = `file://${root}/build-offline/index.html`;
	if (route === '/app' || route === '/app/') return `${base}${query}`;
	if (!route.startsWith('/app/')) {
		throw new Error(`not in the downloaded folder (landing or root): ${path}`);
	}
	return `${base}#${route.slice('/app'.length)}${query}`;
}

/**
 * Where this book is allowed to look.
 *
 * The site under test, files on the disk, and things that never leave the
 * page. Anything else is the internet.
 */
const LOCAL = /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/|file:\/\/|data:|blob:|about:)/;

/** The directory holding playwright.config.ts, and so the build. */
function projectRoot(testInfo: { config: { configFile?: string; rootDir: string } }): string {
	const file = testInfo.config.configFile;
	return file ? file.replace(/[/\\][^/\\]+$/, '') : `${testInfo.config.rootDir}/..`;
}

/**
 * The guard, on every page Playwright opens.
 *
 * Seven spec files used to import `test` straight from Playwright and so
 * had neither of these. In the offline project that meant they ran against
 * the HOSTED server — Playwright derives baseURL from `webServer.port`
 * unless a project sets one — proving nothing about the folder while
 * reporting as though they had. And nothing stopped them reaching the
 * internet.
 */
function guard(page: import('@playwright/test').Page, reachedOut: string[]) {
	return page.route('**/*', (route) => {
		const url = route.request().url();
		if (LOCAL.test(url)) return route.continue();
		reachedOut.push(url);
		return route.abort();
	});
}

function translate(
	page: import('@playwright/test').Page,
	testInfo: import('@playwright/test').TestInfo
) {
	if (testInfo.project.name !== 'offline') return;
	const goto = page.goto.bind(page);
	page.goto = async (url: string, options?: Parameters<typeof goto>[1]) => {
		if (!url.startsWith('/')) return goto(url, options);
		// `about:blank` first, and not for tidiness. On the site every goto is
		// a document load: the reader arrives with nothing remembered. In the
		// folder the whole book is one document and a goto differing only in
		// the hash is a same-document navigation — or, when the address is
		// unchanged, no navigation at all. Two tests said so before this did:
		// an about sheet that stayed open through what the test called a fresh
		// load, and a deep link that never opened its word. Clearing the
		// document first makes the translation exact.
		await goto('about:blank');
		return goto(offlineUrl(projectRoot(testInfo), url), options);
	};
}

/**
 * Wait for the page to become interactive.
 *
 * `attached`, not the default `visible`: what is being waited for is an
 * attribute on <html>, and visibility adds a geometry condition about the
 * root element that nobody meant to assert.
 *
 * Exported because a navigation the test did not drive through goto — a
 * link click, a back button — leaves the page loading again, and in the
 * folder that is a real document load. An assertion after one is safe,
 * because assertions retry; a KEYSTROKE after one is not, and lands on a
 * page where nothing is listening yet.
 */
export async function settled(
	page: import('@playwright/test').Page,
	timeout = 20_000
): Promise<void> {
	await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout });
}

/**
 * For a page that is not expected to come alive: scripting disabled, or a
 * cold load measured while it is still painting. It gets the network guard
 * and the path translation and nothing else.
 *
 * Also for a sweep that READS many pages rather than operating them. The
 * text a sweep reads is in the prerendered HTML; making it wait for
 * hydration and for the webfont on every one of several hundred pages
 * buys nothing and costs the budget it then runs out of.
 */
export const bare = base.extend<object>({
	page: async ({ page }, use, testInfo) => {
		const reachedOut: string[] = [];
		await guard(page, reachedOut);
		translate(page, testInfo);
		await use(page);
		expect(reachedOut, 'the page tried to reach the network').toEqual([]);
	}
});

export const test = base.extend<object>({
	page: async ({ page }, use, testInfo) => {
		// NOTHING REACHES THE NETWORK. A font from a CDN, an analytics
		// beacon, an <img> pointing at a host that no longer exists — each
		// would pass silently here and fail for a reader with no signal,
		// which is half of who this is for. The book is meant to work with
		// the cable pulled out, so the tests run with it pulled out, and a
		// request that tries anyway fails the test that made it rather than
		// being quietly dropped.
		const reachedOut: string[] = [];
		await guard(page, reachedOut);
		translate(page, testInfo);

		const goto = page.goto.bind(page);
		page.goto = async (url: string, options?: Parameters<typeof goto>[1]) => {
			const response = await goto(url, options);
			await settled(page);
			await page.evaluate(() => document.fonts.ready);
			return response;
		};

		await use(page);

		expect(reachedOut, 'the page tried to reach the network').toEqual([]);
	}
});

/**
 * A URL assertion that holds for BOTH editions.
 *
 * Hosted, a route is a path under /app: /app/pl/orationes/pater-noster. In
 * the folder the whole book is one document and the route is its hash, which
 * names no /app because there is no site to be a part of:
 * index.html#/pl/orationes/pater-noster. A test that anchors on either
 * spelling is asserting the shape of a URL rather than where the reader ended
 * up, and it fails on the other edition for a reason that has nothing to do
 * with the book.
 */
export function atRoute(path: string, query = ''): RegExp {
	const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// `.html` for the older folder shape is kept optional rather than removed:
	// it costs nothing and it is what a route assertion means either way.
	const route = escape(path.replace(/^\/app(?=\/|$)/, '')).replace(/^/, '(/app)?');
	return new RegExp(`${route}(\\.html)?${escape(query)}$`);
}

export { expect };

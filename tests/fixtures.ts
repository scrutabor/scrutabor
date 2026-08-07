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
// build-offline/ over file://, where the book has no server, no router and
// no origin. Three bugs reached that edition while lint, types and all 174
// tests were green — the Ordo index asking a router that was not there, a
// panel that walked back out of the prayer when closed, a stylesheet looked
// for one directory too high — and every one of them would have been caught
// here. A path is translated to the file it is: /en/orationes/ave-maria
// becomes app/en/orationes/ave-maria.html, and the query rides along.
import { test as base, expect } from '@playwright/test';

/** A site path as it exists in the downloaded folder. The project root
 * comes from Playwright's own config file — `rootDir` is the TEST
 * directory, which is one level too deep — so this file needs no node
 * types to find it. */
export function offlineUrl(root: string, path: string): string {
	const [, route = '/', query = ''] = /^([^?#]*)([?#].*)?$/.exec(path) ?? [];
	const base = `file://${root}/build-offline`;
	if (route === '/' || route === '') return `${base}/index.html${query}`;
	return `${base}/app${route}.html${query}`;
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
		await page.route('**/*', (route) => {
			const url = route.request().url();
			if (LOCAL.test(url)) return route.continue();
			reachedOut.push(url);
			return route.abort();
		});

		const offline = testInfo.project.name === 'offline';
		const goto = page.goto.bind(page);
		page.goto = async (url: string, options?: Parameters<typeof goto>[1]) => {
			const target = offline && url.startsWith('/') ? offlineUrl(projectRoot(testInfo), url) : url;
			const response = await goto(target, options);
			await page.waitForSelector('html[data-hydrated]', { timeout: 20_000 });
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
 * Hosted, a route is a path: /pl/orationes/pater-noster. In the folder it
 * is the file that path is kept in: …/app/pl/orationes/pater-noster.html.
 * A test that anchors on the path alone is asserting the shape of a URL
 * rather than where the reader ended up, and it fails on the folder for a
 * reason that has nothing to do with the book.
 */
export function atRoute(path: string, query = ''): RegExp {
	const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`${escape(path)}(\\.html)?${escape(query)}$`);
}

export { expect };

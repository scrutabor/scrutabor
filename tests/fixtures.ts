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
import { test as base, expect } from '@playwright/test';

export const test = base.extend<object>({
	page: async ({ page }, use) => {
		const goto = page.goto.bind(page);
		page.goto = async (url: string, options?: Parameters<typeof goto>[1]) => {
			const response = await goto(url, options);
			await page.waitForSelector('html[data-hydrated]', { timeout: 20_000 });
			await page.evaluate(() => document.fonts.ready);
			return response;
		};
		await use(page);
	}
});

export { expect };

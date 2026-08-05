// Every interaction test needs the page to be hydrated, not merely rendered:
// the prerendered HTML carries the words long before the handlers exist, so a
// click can land on nothing. This wraps goto to wait for the marker the root
// layout sets, which removes a whole class of flake.
import { test as base, expect } from '@playwright/test';

export const test = base.extend<object>({
	page: async ({ page }, use) => {
		const goto = page.goto.bind(page);
		page.goto = async (url: string, options?: Parameters<typeof goto>[1]) => {
			const response = await goto(url, options);
			await page.waitForSelector('html[data-hydrated]', { timeout: 20_000 });
			return response;
		};
		await use(page);
	}
});

export { expect };

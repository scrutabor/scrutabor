// The root is a router, not a page: stored choice, then the browser's
// language list, then English (src/routes/+page.svelte). The redirect
// fires from <head> during parse, which aborts the initial load — hence
// waitUntil: 'commit' plus a swallowed goto error before waitForURL.
import { expect, test } from '@playwright/test';

async function landFrom(page: import('@playwright/test').Page): Promise<void> {
	await page.goto('/', { waitUntil: 'commit' }).catch(() => {});
}

test.describe('polish browser', () => {
	test.use({ locale: 'pl-PL' });

	test('the root lands on /pl', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(/\/pl$/);
	});
});

test.describe('english browser', () => {
	test.use({ locale: 'en-US' });

	test('the root lands on /en', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(/\/en$/);
	});
});

test.describe('unsupported browser language', () => {
	test.use({ locale: 'de-DE' });

	test('the root falls back to English', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(/\/en$/);
	});

	test('a stored choice wins over the browser', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-lang', 'pl'));
		await landFrom(page);
		await page.waitForURL(/\/pl$/);
	});
});

test.describe('no javascript', () => {
	test.use({ javaScriptEnabled: false });

	test('the root still offers both languages, English first', async ({ page }) => {
		await page.goto('/');
		const cards = page.locator('.card');
		await expect(cards).toHaveCount(2);
		await expect(cards.first()).toContainText('English');
	});
});

test('the language menu lists English first', async ({ page }) => {
	await page.goto('/pl/orationes/pater-noster');
	await page.locator('.menu > button').click();
	const items = page.locator('[role="listbox"] li');
	await expect(items).toHaveCount(2);
	await expect(items.first()).toContainText('English');
});

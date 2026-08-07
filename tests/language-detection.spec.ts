// The root is a router, not a page: stored choice, then the browser's
// language list, then English (src/routes/+page.svelte). The redirect
// fires from <head> during parse, which aborts the initial load — hence
// waitUntil: 'commit' plus a swallowed goto error before waitForURL.
import { bare as noScript } from './fixtures';
import { atRoute, expect, test } from './fixtures';

async function landFrom(page: import('@playwright/test').Page): Promise<void> {
	await page.goto('/', { waitUntil: 'commit' }).catch(() => {});
}

test.describe('polish browser', () => {
	test.use({ locale: 'pl-PL' });

	test('the root lands on /pl', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(atRoute('/pl'));
	});
});

test.describe('english browser', () => {
	test.use({ locale: 'en-US' });

	test('the root lands on /en', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(atRoute('/en'));
	});
});

test.describe('unsupported browser language', () => {
	test.use({ locale: 'de-DE' });

	test('the root falls back to English', async ({ page }) => {
		await landFrom(page);
		await page.waitForURL(atRoute('/en'));
	});

	test('a stored choice wins over the browser', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-lang', 'pl'));
		await landFrom(page);
		await page.waitForURL(atRoute('/pl'));
	});
});

// Without scripts there is nothing to hydrate, so this block uses the plain
// fixture rather than the one that waits for the marker.
noScript.describe('no javascript', () => {
	noScript.use({ javaScriptEnabled: false });

	noScript('the root still offers both languages, English first', async ({ page }) => {
		await page.goto('/');
		const cards = page.locator('.lang-card');
		await expect(cards).toHaveCount(2);
		await expect(cards.first()).toContainText('English');
	});
});

test('the language menu lists English first', async ({ page }) => {
	await page.goto('/pl/orationes/pater-noster');
	await page.getByRole('button', { name: 'wybór języka' }).click();
	const items = page.locator('[role="listbox"] li');
	await expect(items).toHaveCount(2);
	await expect(items.first()).toContainText('English');
});

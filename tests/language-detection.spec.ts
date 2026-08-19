// Two routers, one rule: stored choice, then the browser's language list,
// then English. The root sends a visitor to their landing page; /app/
// sends a reader into their book. Both redirect from <head> during parse,
// which aborts the initial load — hence waitUntil: 'commit' plus a
// swallowed goto error before waitForURL.
//
// The root router and the landing exist only on the served site (a
// downloaded copy is the book alone), so those tests are @online. The
// app's router IS the folder's index.html, so its tests run in both
// editions.
import { bare as noScript } from './fixtures';
import { atRoute, expect, test } from './fixtures';

async function landFrom(page: import('@playwright/test').Page, from: string): Promise<void> {
	await page.goto(from, { waitUntil: 'commit' }).catch(() => {});
}

test.describe('polish browser', () => {
	test.use({ locale: 'pl-PL' });

	test('the root lands on the Polish landing @online', async ({ page }) => {
		await landFrom(page, '/');
		await page.waitForURL(atRoute('/pl'));
	});

	test('the app router lands on the Polish catalog', async ({ page }) => {
		await landFrom(page, '/app/');
		await page.waitForURL(atRoute('/app/pl'));
	});
});

test.describe('english browser', () => {
	test.use({ locale: 'en-US' });

	test('the root lands on the English landing @online', async ({ page }) => {
		await landFrom(page, '/');
		await page.waitForURL(atRoute('/en'));
	});

	test('the app router lands on the English catalog', async ({ page }) => {
		await landFrom(page, '/app/');
		await page.waitForURL(atRoute('/app/en'));
	});
});

test.describe('unsupported browser language', () => {
	test.use({ locale: 'de-DE' });

	test('the root falls back to English @online', async ({ page }) => {
		await landFrom(page, '/');
		await page.waitForURL(atRoute('/en'));
	});

	test('a stored choice wins over the browser @online', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-lang', 'pl'));
		await landFrom(page, '/');
		await page.waitForURL(atRoute('/pl'));
	});

	test('a stored choice wins in the app router too', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-lang', 'pl'));
		await landFrom(page, '/app/');
		await page.waitForURL(atRoute('/app/pl'));
	});
});

// The landing writes the reader's language, so the app opens in it: the
// path a first-time visitor actually walks — landing, then the CTA.
test.describe('the landing hands its language to the app', () => {
	test.use({ locale: 'de-DE' });

	test('a visitor who chose the Polish landing gets the Polish book @online', async ({ page }) => {
		await page.goto('/pl');
		await landFrom(page, '/app/');
		await page.waitForURL(atRoute('/app/pl'));
	});
});

// Without scripts there is nothing to hydrate, so this block uses the plain
// fixture rather than the one that waits for the marker.
noScript.describe('no javascript', () => {
	noScript.use({ javaScriptEnabled: false });

	noScript('the root still offers both languages, English first @online', async ({ page }) => {
		await page.goto('/');
		const cards = page.locator('.lang-card');
		await expect(cards).toHaveCount(2);
		await expect(cards.first()).toContainText('English');
	});

	noScript(
		'the app router still offers both languages, English first @online',
		async ({ page }) => {
			await page.goto('/app/');
			const cards = page.locator('.lang-card');
			await expect(cards).toHaveCount(2);
			await expect(cards.first()).toContainText('English');
		}
	);

	// The folder's answer to the same question, and it is a different answer:
	// there is no prerendered page to fall back to, because the whole book is
	// built from the corpus the runtime carries. That is the one thing this
	// edition gives up, and it says so instead of showing a blank window.
	noScript('the downloaded copy says what it needs @folder', async ({ page }) => {
		await page.goto('/app/');
		const notice = page.locator('.noscript');
		await expect(notice.locator('[lang="pl"]')).toContainText('potrzebuje JavaScriptu');
		await expect(notice.locator('[lang="en"]')).toContainText('needs JavaScript');
	});
});

test('the language menu lists English first', async ({ page }) => {
	await page.goto('/app/pl/orationes/pater-noster');
	await page.getByRole('button', { name: 'wybór języka' }).click();
	const items = page.locator('[role="listbox"] li');
	await expect(items).toHaveCount(2);
	await expect(items.first()).toContainText('English');
});

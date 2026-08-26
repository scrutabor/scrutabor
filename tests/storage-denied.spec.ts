// The book with storage DENIED — Chrome's "block all cookies", enterprise
// policy, privacy extensions. There the localStorage property itself throws,
// and one unguarded read during hydration used to kill SvelteKit's router
// before it initialised: the word panel dead, the day picker dead, silently,
// on every page — for exactly the readers most likely to have set it.
// Every local or session read and write goes through $lib/storage, which is what these
// hold in place. The prerendered text was never at risk; the settings simply
// last only as long as the page, which is the most the book can offer.
import { expect, settled, test } from './fixtures';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		for (const name of ['localStorage', 'sessionStorage']) {
			Object.defineProperty(window, name, {
				get() {
					throw new DOMException('denied', 'SecurityError');
				}
			});
		}
	});
});

test('the word panel still opens', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/pater-noster');
	await settled(page);
	await page.locator('button.word').nth(2).click();
	await expect(page.locator('aside')).toBeVisible();
});

test('the day still fills the slots', async ({ page }) => {
	await page.goto('/app/pl/ordo/catechumenorum');
	await settled(page);
	await page.selectOption('.picker.day select', 'dominica-i-adventus');
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15_000 });
});

test('the controls above the text still answer', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/credo');
	await settled(page);
	const before = await page.evaluate(() => document.documentElement.dataset.theme ?? 'light');
	await page
		.locator('button[aria-label*="tryb ciemny"], button[aria-label*="tryb jasny"]')
		.first()
		.click();
	const after = await page.evaluate(() => document.documentElement.dataset.theme ?? 'light');
	expect(after).not.toBe(before);
});

test('search still finds a prayer when return-position storage is unavailable', async ({
	page
}) => {
	await page.goto('/app/pl/search');
	await page.getByRole('searchbox').fill('Duszo Chrystusowa');
	await expect(page.locator('#search-titles + ul li').first()).toContainText('Duszo Chrystusowa');
});

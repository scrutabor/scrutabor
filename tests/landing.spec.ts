// The landing: the site's front door, and the acquisition surface the
// app stores will point at. It exists only on the served site — the
// downloaded folder is the book alone — so the whole file is @online.
// Its axe sweep lives with the others in a11y.spec.
import { atRoute, expect, test } from './fixtures';

test.describe('landing @online', () => {
	test('the CTA opens the book in the landing language', async ({ page }) => {
		await page.goto('/pl');
		await page.getByRole('link', { name: 'Otwórz modlitewnik' }).click();
		await page.waitForURL(atRoute('/app/pl'));
		// the catalog, alive — not merely a URL
		await expect(page.locator('.flow-title')).toHaveText('Ordo Missæ');
	});

	test('hreflang binds the two landings and the root', async ({ page, request }) => {
		for (const lang of ['pl', 'en']) {
			await page.goto(`/${lang}`);
			await expect(page.locator(`link[rel="canonical"]`)).toHaveAttribute(
				'href',
				`https://scrutabor.org/${lang}`
			);
			for (const l of ['pl', 'en']) {
				await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveAttribute(
					'href',
					`https://scrutabor.org/${l}`
				);
			}
			await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
				'href',
				'https://scrutabor.org/en'
			);
		}
		// the root router carries the pair too, for crawlers that land there
		const root = await (await request.get('/')).text();
		expect(root).toContain('hreflang="pl" href="https://scrutabor.org/pl"');
		expect(root).toContain('hreflang="en" href="https://scrutabor.org/en"');
	});

	test('the specimen is the reading mechanism, not a picture of it', async ({ page }) => {
		await page.goto('/pl');
		// seven glossed words, set with the same ruby the book uses
		await expect(page.locator('.specimen-line ruby')).toHaveCount(7);
		await expect(page.locator('.sw.named rt')).toHaveText('będę zgłębiał');
		// and the panel a tap would open, already open on its name-word
		await expect(page.locator('.panel-lemma')).toContainText('scrutari');

		await page.goto('/en');
		await expect(page.locator('.sw.named rt')).toHaveText('I will search');
	});

	test('the offline copy is really there to download', async ({ page, request }) => {
		await page.goto('/en');
		const link = page.getByRole('link', { name: 'Download Scrutabor.zip' });
		await expect(link).toHaveAttribute('href', '/Scrutabor.zip');
		const zip = await request.get('/Scrutabor.zip');
		expect(zip.ok()).toBe(true);
		// a real package, not a placeholder: the book inside is MB-scale
		expect((await zip.body()).length).toBeGreaterThan(1_000_000);
	});

	test('the privacy page states the promise in both languages', async ({ page }) => {
		await page.goto('/pl/privacy');
		await expect(page.locator('h1')).toHaveText('Prywatność');
		await expect(page.locator('.lede')).toContainText('nie zbiera danych');
		await page.goto('/en/privacy');
		await expect(page.locator('h1')).toHaveText('Privacy');
		await expect(page.locator('.lede')).toContainText('collects no data');
		// the store-facing URL must not silently become a 404 shell
		expect((await page.request.get('/en/privacy')).status()).toBe(200);
	});

	test('the footer reaches the public source', async ({ page }) => {
		await page.goto('/en');
		await expect(page.getByRole('link', { name: 'source on GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/scrutabor'
		);
	});
});

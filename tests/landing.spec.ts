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

	test('the language menu switches the landing, not the book', async ({ page }) => {
		await page.goto('/pl');
		await page.getByRole('button', { name: 'wybór języka' }).click();
		await page.locator('[role="listbox"] a', { hasText: 'English' }).click();
		await page.waitForURL(atRoute('/en'));
		await expect(page.getByRole('link', { name: 'Open the prayer book' })).toBeVisible();
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

	test('the specimen walks the slider: bare Latin, glosses, translation', async ({ page }) => {
		// The tiers are the app's own TextBody at each help level — the
		// mechanism itself, not a picture of it — so what is asserted is
		// what the reading pages themselves render at each stop.
		await page.goto('/pl');
		// three tiers, labelled with the slider's own words
		const labels = page.locator('.tier-label');
		await expect(labels).toHaveText(['sama łacina', 'słowo po słowie', 'pełny przekład']);
		// the bare tier shows no glosses; the glossed tiers carry the verse
		await expect(page.locator('.tier').nth(0).locator('rt')).toHaveCount(0);
		await expect(page.locator('.tier').nth(1).locator('rt')).toHaveCount(14);
		await expect(page.locator('.tier').nth(2).locator('rt')).toHaveCount(14);
		// the consecutive et is glossed "a", as Polish renders it
		await expect(page.locator('.tier').nth(1).locator('rt').nth(3)).toHaveText('a');
		// the fullest step adds the verse's translation, in the app's own slot
		await expect(page.locator('.tier').nth(2).locator('.translation')).toContainText(
			'Daj mi zrozumienie'
		);
		// and the panel a tap would open, on the name-word itself
		await expect(page.locator('.panel-head')).toHaveText('scrutabor');
		await expect(page.locator('.panel-lemma')).toContainText('scrutari');

		await page.goto('/en');
		await expect(page.locator('.tier').nth(1).locator('rt').nth(4)).toHaveText('I will search');
		await expect(page.locator('.tier').nth(2).locator('.translation')).toContainText(
			'Give me understanding'
		);
	});

	test('the sections are doors into the book', async ({ page }) => {
		await page.goto('/pl');
		await expect(page.locator('.cards .card')).toHaveCount(3);
		await expect(page.locator('.cards .card').nth(0)).toHaveAttribute('href', '/app/pl/ordo');
		await expect(page.locator('.cards .card').nth(1)).toHaveAttribute('href', '/app/pl');
		await expect(page.locator('.cards .card').nth(2)).toHaveAttribute('href', '/app/pl/grammatica');
	});

	test('the download link points at the latest release', async ({ page }) => {
		// The zip travels with each GitHub release, not with the site — so
		// this asserts the address, and the release ritual owns the file.
		await page.goto('/en');
		await expect(page.getByRole('link', { name: 'Download Scrutabor.zip' })).toHaveAttribute(
			'href',
			'https://github.com/scrutabor/scrutabor-app/releases/latest/download/Scrutabor.zip'
		);
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

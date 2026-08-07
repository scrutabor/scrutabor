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

	test('the specimen is the book itself: the real slider over the real verse', async ({ page }) => {
		// Not a picture of the mechanism — the mechanism: psalmi.118-he's
		// verse 34 from the corpus, TextBody, and the same slider a
		// reading page carries.
		await page.goto('/pl');
		const slider = page.locator('.specimen input[type="range"]');
		await expect(slider).toHaveValue('1');
		// the real corpus text: liturgical accents, and the colon the
		// witnesses print where the brand motto prints a comma
		await expect(page.locator('.specimen')).toContainText('scrutábor');
		await expect(page.locator('.specimen')).toContainText('tuam:');
		// bare Latin
		await slider.fill('0');
		await expect(page.locator('.specimen rt')).toHaveCount(0);
		// the full step: all fourteen glosses (the consecutive et as "a")
		// and the verse's own translation
		await slider.fill('2');
		await expect(page.locator('.specimen rt')).toHaveCount(14);
		await expect(page.locator('.specimen rt').nth(3)).toHaveText('a');
		await expect(page.locator('.specimen .translation')).toContainText('Daj mi zrozumienie');

		await page.goto('/en');
		await page.locator('.specimen input[type="range"]').fill('2');
		await expect(page.locator('.specimen .translation')).toContainText('Give me understanding');
	});

	test('the analysis box stands open on scrutábor, and taps re-aim it', async ({ page }) => {
		await page.goto('/pl');
		// pre-selected on the name-word: the analysis is already in the
		// page — a box, not a sheet, with nothing to close
		await expect(page.locator('.word-box-form')).toHaveText('scrutábor');
		await expect(page.locator('.word-box a[href="/app/pl/lemma/scrutor"]')).toBeVisible();
		await expect(page.locator('aside')).toHaveCount(0);
		// the tapped word carries the selection wash
		await expect(page.locator('#w016')).toHaveClass(/selected/);
		// a tap re-aims the box at another word
		await page.locator('#w017').click();
		await expect(page.locator('.word-box-form')).toHaveText('legem');
		// and a cross-reference in the note re-aims it too: scrutábor's
		// note points at the Da it answers
		await page.locator('#w016').click();
		await page.locator('.word-box .xref').click();
		await expect(page.locator('.word-box-form')).toHaveText('Da');
	});

	test('the motto and the specimen both reach the psalm page', async ({ page }) => {
		await page.goto('/pl');
		await expect(page.locator('.motto-ref a')).toHaveAttribute('href', '/app/pl/psalmi/118-he');
		await expect(page.locator('.stanza-link a')).toHaveAttribute('href', '/app/pl/psalmi/118-he');
		await page.locator('.stanza-link a').click();
		await page.waitForURL(atRoute('/app/pl/psalmi/118-he'));
		await expect(page.locator('h1')).toHaveText('Psalmus 118, HE');
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

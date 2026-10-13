import { expect, test, setHelp } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
const psalm = 'vigilia-paschalis-laudes-psalmus';
const canticle = 'vigilia-paschalis-laudes-canticum';
const words = (page: Page, slug: string) => page.locator(`main [id^="${slug}.w"]`);
const lauds = (page: Page) =>
	page.locator('.part').filter({
		has: page.locator('.part-title').filter({ hasText: /^Laudes$/ })
	});

for (const lang of ['pl', 'en']) {
	test(`${lang}: Vigil Lauds displays both complete texts before the postcommunion @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04`);
		await expect(lauds(page)).toHaveCount(1);
		await expect(words(page, psalm)).toHaveCount(81);
		await expect(words(page, canticle)).toHaveCount(181);
		const titles = await page.locator('.part-title').allTextContents();
		expect(titles.indexOf('Laudes')).toBe(titles.indexOf('Postcommúnio') - 1);
		await expect(page.locator(`[id="${canticle}.w068"]`)).toContainText(/Iurisiurándi/);
		await page.locator(`[id="${canticle}.w068"]`).click();
		await expect(page.locator('aside .form').first()).toContainText(/Iurisiurándi/);
		await expect(page).toHaveURL(/w=vigilia-paschalis-laudes-canticum\.w068/);
	});

	test(`${lang}: the complete Vigil catalogue retains both Lauds word identities @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/formularium/vigilia-paschalis?w=${psalm}.w001`);
		await expect(words(page, psalm)).toHaveCount(81);
		await expect(words(page, canticle)).toHaveCount(181);
		await expect(page.locator(`[id="${psalm}.w001"]`)).toHaveClass(/selected/);
		await expect(page.locator('aside .form').first()).toContainText(/Allelúia/);
	});

	test(`${lang}: Easter Sunday and an explicit Ordinary choice have no Vigil Office @reader`, async ({
		page
	}) => {
		for (const query of ['dies=2026-04-05', 'dies=2026-04-04&missa=none']) {
			await page.goto(`/app/${lang}/ordo/conclusio?${query}`);
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
			await expect(lauds(page)).toHaveCount(0);
			await expect(words(page, psalm)).toHaveCount(0);
			await expect(words(page, canticle)).toHaveCount(0);
		}
	});

	test(`${lang}: a pending Vigil keeps its Lauds heading, loader and requested word @online`, async ({
		page
	}) => {
		let release!: () => void;
		const pending = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/artifacts/proprium/**', async (route) => {
			await pending;
			await route.continue();
		});
		try {
			await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04&w=${canticle}.w068`);
			await expect(lauds(page).locator('.part-loading')).toHaveCount(1);
			await expect(words(page, canticle)).toHaveCount(0);
			await expect(page).toHaveURL(/w=vigilia-paschalis-laudes-canticum\.w068/);
			release();
			await expect(words(page, canticle)).toHaveCount(181);
			await expect(lauds(page).locator('.part-loading')).toHaveCount(0);
			await expect(page.locator(`[id="${canticle}.w068"]`)).toHaveClass(/selected/);
		} finally {
			release();
		}
	});

	test(`${lang}: a failed Vigil says its Lauds could not load instead of silently omitting them @online`, async ({
		page
	}) => {
		await page.route('**/artifacts/proprium/**', (route) =>
			route.fulfill({ status: 503, body: 'unavailable' })
		);
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04&w=${canticle}.w068`);
		await expect(lauds(page)).toHaveCount(1);
		await expect(lauds(page).locator('[role="status"]')).toBeVisible();
		await expect(lauds(page).locator('.part-loading')).toHaveCount(0);
		await expect(words(page, psalm)).toHaveCount(0);
		await expect(words(page, canticle)).toHaveCount(0);
		await expect(page).toHaveURL(/w=vigilia-paschalis-laudes-canticum\.w068/);
	});

	test(`${lang}: narrow and print views retain all Lauds words in both reading modes @reader`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04`);
		for (const mode of [1, 2] as const) {
			await setHelp(page, mode);
			await expect(words(page, psalm)).toHaveCount(81);
			await expect(words(page, canticle)).toHaveCount(181);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(lauds(page)).toBeVisible();
		await expect(words(page, psalm)).toHaveCount(81);
		await expect(words(page, canticle)).toHaveCount(181);
	});
}

import { expect, test, setHelp } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
const slug = 'ite-missa-est-paschale';
const words = (page: Page, prefix: string) => page.locator(`main [id^="${prefix}.w"]`);
const dismissal = (page: Page) =>
	page.locator('.part').filter({
		has: page.locator('.part-title').filter({ hasText: /^Ite, missa est$/ })
	});

for (const lang of ['pl', 'en']) {
	test(`${lang}: paschal dismissal has all words, a real word card and the bounded ritual note @reader`, async ({
		page
	}) => {
		for (const date of ['2026-04-04', '2026-04-05']) {
			await page.goto(`/app/${lang}/ordo/conclusio?dies=${date}&w=${slug}.w010`);
			await expect(words(page, slug)).toHaveCount(15);
			await expect(words(page, 'ite-missa-est')).toHaveCount(0);
			await expect(page.locator('aside .form').first()).toContainText('Deo');
			await expect(page).toHaveURL(new RegExp(`w=${slug}\\.w010`));
			await expect(dismissal(page)).toContainText(lang === 'pl' ? 'De Tempore' : 'temporal Masses');
			if (date === '2026-04-04')
				await expect(dismissal(page)).toContainText(
					lang === 'pl' ? 'diakon lub sam kapłan' : 'deacon or priest'
				);
			else
				await expect(dismissal(page)).not.toContainText(
					lang === 'pl' ? 'diakon lub sam kapłan' : 'deacon or priest'
				);
		}
	});

	test(`${lang}: Ordinary-alone and Low Sunday have no paschal replacement @reader`, async ({
		page
	}) => {
		for (const query of ['dies=2026-04-04&missa=none', 'dies=2026-04-12']) {
			await page.goto(`/app/${lang}/ordo/conclusio?${query}`);
			await expect(words(page, 'ite-missa-est').first()).toBeVisible();
			await expect(words(page, slug)).toHaveCount(0);
			await expect(dismissal(page)).not.toContainText(
				lang === 'pl' ? 'De Tempore' : 'temporal Masses'
			);
		}
	});

	test(`${lang}: pending replacement preserves address and never flashes Ordinary @online`, async ({
		page
	}) => {
		let release!: () => void;
		const wait = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/artifacts/dismissal/**', async (route) => {
			await wait;
			await route.continue();
		});
		try {
			await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04&w=${slug}.w010`);
			await expect(dismissal(page).locator('.part-loading')).toHaveCount(1);
			await expect(words(page, 'ite-missa-est')).toHaveCount(0);
			await expect(words(page, slug)).toHaveCount(0);
			await expect(page).toHaveURL(new RegExp(`w=${slug}\\.w010`));
			release();
			await expect(words(page, slug)).toHaveCount(15);
			await expect(dismissal(page).locator('.part-loading')).toHaveCount(0);
			await expect(page.locator('aside .form').first()).toContainText('Deo');
		} finally {
			release();
		}
	});

	test(`${lang}: failure announces the missing replacement and preserves the deep link @online`, async ({
		page
	}) => {
		await page.route('**/artifacts/dismissal/**', (route) =>
			route.fulfill({ status: 503, body: 'unavailable' })
		);
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04&w=${slug}.w010`);
		await expect(dismissal(page).locator('[role="status"]')).toBeVisible();
		await expect(words(page, 'ite-missa-est')).toHaveCount(0);
		await expect(words(page, slug)).toHaveCount(0);
		await expect(page).toHaveURL(new RegExp(`w=${slug}\\.w010`));
	});

	test(`${lang}: mobile and print retain dismissal words and ritual directions @reader`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-04`);
		for (const mode of [0, 1, 2] as const) {
			await setHelp(page, mode);
			await expect(words(page, slug)).toHaveCount(15);
			await expect(dismissal(page)).toContainText(
				lang === 'pl' ? 'diakon lub sam kapłan' : 'deacon or priest'
			);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(words(page, slug)).toHaveCount(15);
		await expect(dismissal(page)).toBeVisible();
	});

	test(`${lang}: folded Vigil prayer retains its omission guidance, without automatic suppression @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/communio?dies=2026-04-04`);
		const folded = page.locator('.part.folded').filter({
			has: page.locator('.unfold-title', { hasText: 'Dómine Iesu Christe, qui dixísti' })
		});
		await expect(folded).toContainText(
			lang === 'pl' ? 'opuszcza się tę modlitwę' : 'this prayer and the kiss of peace are omitted'
		);
		await folded.locator('button.unfold').click();
		await expect(page.locator('[id="qui-dixisti.w001"]')).toBeVisible();
	});
}

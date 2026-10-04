import { bare, expect } from './fixtures';

bare.use({ serviceWorkers: 'block' });

const languages = [
	['pl', 'wczytywanie', '7. Niedziela po Zesłaniu Ducha Świętego', '12 lipca 2026'],
	['en', 'loading', '7th Sunday after Pentecost', '12 July 2026']
] as const;

for (const host of ['@online', '@online @static-host']) {
	for (const [lang, pending, title, date] of languages) {
		bare(`the day stays pending until its date is known: ${lang} ${host}`, async ({ page }) => {
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				let release!: () => void;
				const scripts = new Promise<void>((resolve) => (release = resolve));
				const pattern = '**/_app/immutable/**/*.js';
				await page.route(pattern, async (route) => {
					await scripts;
					await route.continue();
				});
				try {
					await page.goto(`/app/${lang}/ordo/canon?dies=2026-07-12`, {
						waitUntil: 'domcontentloaded'
					});
					await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
					await page.evaluate(() => document.fonts.ready);
					const picker = page.locator('.day-open');
					await expect(picker.locator('.choice-title')).toHaveText(pending);
					await expect(picker).toBeDisabled();
					await expect(picker).toHaveAttribute('aria-busy', 'true');
					const before = await picker.boundingBox();
					const rowBefore = await page.locator('.picker.day').boundingBox();
					const mainBefore = await page.locator('main').boundingBox();
					expect(before).not.toBeNull();
					expect(rowBefore).not.toBeNull();
					expect(mainBefore).not.toBeNull();
					release();
					await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
					await expect(picker).toBeEnabled();
					await expect(picker).toHaveAttribute('aria-busy', 'false');
					await expect(picker.locator('.choice-title')).toHaveText(title);
					await expect(picker.locator('.choice-date')).toHaveText(date);
					const after = await picker.boundingBox();
					const rowAfter = await page.locator('.picker.day').boundingBox();
					const mainAfter = await page.locator('main').boundingBox();
					expect(after).not.toBeNull();
					expect(rowAfter).not.toBeNull();
					expect(mainAfter).not.toBeNull();
					expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
					expect(Math.abs(rowAfter!.height - rowBefore!.height)).toBeLessThanOrEqual(1);
					expect(Math.abs(mainAfter!.y - mainBefore!.y)).toBeLessThanOrEqual(1);
					expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
						0
					);
				} finally {
					release();
					await page.unroute(pattern);
				}
			}
		});
	}
}

bare.describe('without scripting', () => {
	bare.use({ javaScriptEnabled: false });
	for (const [lang, pending] of languages) {
		bare(`an unresolved day is not a false empty selection: ${lang} @online`, async ({ page }) => {
			await page.goto(`/app/${lang}/ordo/canon?dies=2026-07-12`);
			await expect(page.locator('.day-open .choice-title')).toHaveText(pending);
			await expect(page.locator('.day-open')).toBeDisabled();
			await expect(page.locator('.noscript-note')).toBeVisible();
		});
	}
});

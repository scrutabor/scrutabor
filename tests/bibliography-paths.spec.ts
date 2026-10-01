import { expect, setTheme, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} bibliography wraps long source paths without losing their links`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/bibliographia`);
		const source = page.locator('li.source').filter({
			has: page.locator('cite', { hasText: 'Divinum Officium: Horae, Latin data' })
		});
		await source.locator('summary').click();
		const body = source.locator('a[href$="/web/www/horas/Latin/Commune/C3a-1.txt"]');
		await expect(body).toBeVisible();
		await expect(body).toContainText('heading 55, reference 56, body 57');
		const prayer = source.locator('a[href$="/web/www/horas/Latin/Psalterium/Common/Prayers.txt"]');
		await expect(prayer).toHaveCount(1);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await page.evaluate(() => document.fonts.ready);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				for (const locator of [body, prayer]) {
					await locator.scrollIntoViewIfNeeded();
					await locator.focus();
					await expect(locator).toBeFocused();
					const bounds = await locator.boundingBox();
					expect(bounds).not.toBeNull();
					expect(bounds!.x).toBeGreaterThanOrEqual(0);
					expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
				}
			}
		}
	});
}

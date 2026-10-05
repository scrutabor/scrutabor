import { expect, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} discloses the scope of prayer selection on reading and calendar pages`, async ({
		page
	}) => {
		const message =
			language === 'pl'
				? 'Dobór modlitw nie uwzględnia jeszcze wspomnień liturgicznych ani kalendarzy lokalnych.'
				: 'The selection of prayers does not yet account for liturgical commemorations or local calendars.';
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(`/app/${language}/ordo/offertorium?dies=2049-07-25`);
		await expect(page.locator('.page > header .formulary-scope')).toHaveText(message);
		await expect(page.locator('.page > header .formulary-scope')).toBeVisible();
		await page.emulateMedia({ media: 'print' });
		await expect(page.locator('.page > header .formulary-scope')).toBeVisible();
		await page.emulateMedia({ media: 'screen' });
		await page.locator('.day-open').click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.formulary-scope')).toHaveText(message);
		await expect(dialog.locator('.day-detail h3')).toHaveText(
			language === 'pl' ? '7. Niedziela po Zesłaniu Ducha Świętego' : '7th Sunday after Pentecost'
		);
		await expect(dialog.locator('.formulary-scope')).toBeVisible();
		await page.keyboard.press('Escape');
		for (const route of ['formularium', 'formularium/dominica-vii-post-pentecosten']) {
			await page.goto(`/app/${language}/${route}`);
			await expect(page.locator('.formulary-scope')).toHaveText(message);
			await expect(page.locator('.formulary-scope')).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
			await page.emulateMedia({ media: 'print' });
			await expect(page.locator('.formulary-scope')).toBeVisible();
			await page.emulateMedia({ media: 'screen' });
		}
	});
}

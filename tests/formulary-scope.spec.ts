import { expect, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} discloses the scope of prayer selection on reading and calendar pages`, async ({
		page
	}) => {
		// The edition now assembles five commemorations; the note names each and still says
		// what it does not account for.
		const message =
			language === 'pl'
				? 'Dobór modlitw uwzględnia wspomnienia Litanii Większych, świętej Petroneli, niedzieli przeszkodzonej, święta przeszkodzonego i dnia powszedniego Adwentu, ale nie uwzględnia jeszcze innych wspomnień liturgicznych ani kalendarzy lokalnych.'
				: 'The selection of prayers accounts for the commemorations of the Greater Litanies, Saint Petronilla, the impeded Sunday, the impeded feast and the weekday of Advent, but not yet for other liturgical commemorations or local calendars.';
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(`/app/${language}/ordo/offertorium?dies=2049-07-25`);
		await expect(page.locator('.page > header .formulary-scope')).toHaveText(message);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'Petroneli' : 'Petronilla'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'niedzieli przeszkodzonej' : 'the impeded Sunday'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'święta przeszkodzonego' : 'the impeded feast'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'dnia powszedniego Adwentu' : 'the weekday of Advent'
		);
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

import { expect, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} discloses the scope of prayer selection on reading and calendar pages`, async ({
		page
	}) => {
		// The note includes the bounded weekday-Vigil relations and still says
		// what it does not account for.
		const message =
			language === 'pl'
				? 'Przy doborze modlitw uwzględniamy wspomnienia Litanii Większych, św. Petroneli, niedziel i świąt, które ustępują innym obchodom, oraz dni powszednich Adwentu. W wybranych przypadkach uwzględniamy także wspomnienia świętych w Wigilię Wniebowstąpienia oraz wspomnienie samej Wigilii, gdy ustępuje świętu. Pozostałe wspomnienia i kalendarze lokalne czekają na uzupełnienie.'
				: 'Prayer selection includes commemorations of the Greater Litanies, Saint Petronilla, Sundays and feasts that give way to another observance, and Advent weekdays. In the cases listed here, it also includes commemorations of saints on the Vigil of the Ascension and of the Vigil itself when a feast takes precedence. Other commemorations and local calendars are still to be added.';
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(`/app/${language}/ordo/offertorium?dies=2049-07-25`);
		await expect(page.locator('.page > header .formulary-scope')).toHaveText(message);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'Petroneli' : 'Petronilla'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'niedziel i świąt, które ustępują' : 'Sundays and feasts that give way'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'dni powszednich Adwentu' : 'Advent weekdays'
		);
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'Wigilię Wniebowstąpienia' : 'Vigil of the Ascension'
		);
		await expect(page.locator('.page > header .formulary-scope')).toBeVisible();
		await page.emulateMedia({ media: 'print' });
		await expect(page.locator('.page > header .formulary-scope')).toContainText(
			language === 'pl' ? 'Wigilię Wniebowstąpienia' : 'Vigil of the Ascension'
		);
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
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto(`/app/${language}/formularium`);
		const scope = (await page.locator('.formulary-scope').boundingBox())!;
		const lead = (await page.locator('main .lead').boundingBox())!;
		expect(scope.x).toBeCloseTo(lead.x, 0);
		expect(scope.width).toBeCloseTo(lead.width, 0);
		await page.goto(`/app/${language}/ordo/offertorium?dies=2049-07-25`);
		expect((await page.locator('.formulary-scope').boundingBox())!.width).toBeGreaterThan(540);
	});
}

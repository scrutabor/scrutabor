import { expect, test } from './fixtures';

const occurrences = [
	['iv', '2028-01-30', '2029-11-04'],
	['v', '2028-02-06', '2026-11-08'],
	['vi', '2038-02-14', '2026-11-15']
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const [roman, winter, autumn] of occurrences) {
		test(`${language} Epiphany ${roman} reads its seasonal chants on both dates`, async ({
			page
		}) => {
			for (const [date, resumed] of [
				[winter, false],
				[autumn, true]
			] as const) {
				await page.goto(`/app/${language}/ordo/catechumenorum?dies=${date}`);
				const expected = resumed
					? 'dominica-xxiii-post-pentecosten'
					: 'dominica-iii-post-epiphaniam';
				const unexpected = resumed
					? 'dominica-iii-post-epiphaniam'
					: 'dominica-xxiii-post-pentecosten';
				for (const chant of ['introitus', 'alleluia']) {
					await expect(page.locator(`[id="${expected}-${chant}.w001"]`)).toBeVisible();
					await expect(page.locator(`[id="${unexpected}-${chant}.w001"]`)).toHaveCount(0);
				}
				const gradual = resumed ? expected : 'dominica-xvi-post-pentecosten';
				await expect(page.locator(`[id="${gradual}-graduale.w001"]`)).toBeVisible();
				await expect(
					page.locator(`[id="dominica-${roman}-post-epiphaniam-epistola.w001"]`)
				).toBeVisible();
				await page.locator('.day-open').click();
				await expect(page.getByRole('dialog').locator('.day-detail h3')).toContainText(
					resumed
						? language === 'pl'
							? 'Przeniesiona'
							: 'Transferred'
						: language === 'pl'
							? 'Niedziela po Objawieniu'
							: 'Sunday after Epiphany'
				);
				await page.keyboard.press('Escape');
			}
		});
	}

	test(`${language} retains the printed resumed third Sunday in the study catalogue`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/dominica-iii-quae-superfuit-post-epiphaniam`);
		await expect(
			page.locator('[id="dominica-xxiii-post-pentecosten-introitus.w001"]')
		).toBeVisible();
		await expect(page.locator('[id="dominica-iii-post-epiphaniam-collecta.w001"]')).toBeVisible();
	});
}

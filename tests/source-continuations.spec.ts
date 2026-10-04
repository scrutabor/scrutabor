import { expect, test } from './fixtures';

const subjects = [
	{
		day: 'sancti-thomae-apostoli',
		part: 'evangelium',
		leaves: [416, 521, 522],
		locators: ['p. 335', 'p. 440', 'p. 441']
	},
	{
		day: 'maternitas-beatae-mariae-virginis',
		part: 'secreta',
		leaves: [22, 23, 782],
		locators: ['p. xvii', 'p. xviii', 'p. 701']
	},
	{
		day: 'omnium-sanctorum',
		part: 'secreta',
		leaves: [22, 800],
		locators: ['p. xvii', 'p. 719']
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const subject of subjects) {
		test(`${language} ${subject.day} discloses source continuations separately`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/formularium/${subject.day}`);
			await page
				.locator(`#text-proprium-${subject.day}-${subject.part}`)
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const dialog = page.getByRole('dialog');
			const notes = dialog.locator('details.source-notes');
			await notes.locator('summary').click();
			for (const leaf of subject.leaves) {
				await expect(
					notes.locator(
						`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
					)
				).toHaveCount(1);
			}
			for (const locator of subject.locators) await expect(notes).toContainText(locator);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		});
	}
	for (const width of [1280, 390]) {
		for (const variant of ['in-die', 'in-nocte']) {
			test(`${language} Easter Preface ${variant} binds both printed pages at ${width}px`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 844 });
				await page.goto(`/app/${language}/ordinarium/praefatio-paschalis-${variant}`);
				await page
					.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
					.click();
				const notes = page.locator('details.source-notes');
				await notes.locator('summary').click();
				for (const [leaf, printedPage] of [
					[315, 236],
					[316, 237]
				]) {
					const selector = `a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`;
					const link = notes.locator(selector);
					await expect(link).toHaveCount(1);
					await expect(link).toBeVisible();
					await expect(notes.locator('li').filter({ has: page.locator(selector) })).toContainText(
						`p. ${printedPage}`
					);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			});
		}
		test(`${language} Epiphany Preface cites its sung parallel at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(`/app/${language}/ordinarium/praefatio-epiphaniae`);
			await page
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const notes = page.locator('details.source-notes');
			await notes.locator('summary').click();
			for (const [leaf, printedPage] of [
				[366, 287],
				[307, 228],
				[308, 229]
			]) {
				const selector = `a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`;
				const link = notes.locator(selector);
				await expect(link).toHaveCount(1);
				await expect(link).toBeVisible();
				await expect(notes.locator('li').filter({ has: page.locator(selector) })).toContainText(
					`p. ${printedPage}`
				);
			}
		});
	}
}

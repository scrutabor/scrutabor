import { expect, setHelp, test } from './fixtures';

const route = 'formularium/dominica-xxii-post-pentecosten';
const text = 'dominica-xxii-post-pentecosten-postcommunio';
const constructions = [
	{ language: 'pl', gloss: 'dary świętego misterium', words: 3 },
	{ language: 'pl', gloss: 'przyniosło pomoc w naszej słabości', words: 5 },
	{ language: 'en', gloss: 'the gifts of the sacred mystery', words: 3 },
	{ language: 'en', gloss: 'You commanded us to do in remembrance of You', words: 6 },
	{ language: 'en', gloss: 'may help us in our weakness', words: 5 },
	{ language: 'en', gloss: 'of the Holy Spirit', words: 2 },
	{ language: 'en', gloss: 'forever and ever', words: 4 }
];

for (const { language, gloss, words } of constructions) {
	test(`${language} postcommunion preserves ${gloss}`, async ({ page }) => {
		await page.goto(`/app/${language}/${route}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
		const group = part.locator('.token-group').filter({ hasText: gloss });
		await expect(group).toHaveCount(1);
		await expect(group.locator('rt')).toHaveText(gloss);
		await expect(group.locator('.token')).toHaveCount(words);
		const button = group.locator(':scope > button');
		await expect(button).toHaveCount(1);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			await group.scrollIntoViewIfNeeded();
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			const before = await group.boundingBox();
			await button.hover();
			expect(await group.boundingBox()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card')).toHaveCount(words);
			await page.keyboard.press('Escape');
			await expect(group.locator('rt')).toHaveText(gloss);
		}
	});
}

for (const language of ['pl', 'en']) {
	test(`${language} postcommunion preserves its separate relative and response`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/${route}`);
		await setHelp(page, 1);
		await expect(page.locator(`[id="${text}.w009"] rt`)).toHaveText(
			language === 'pl' ? 'to, co' : 'what'
		);
		await expect(page.locator(`[id="${text}.w037"] rt`)).toHaveText('Amen');
		await setHelp(page, 2);
		const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
		await expect(part).toContainText(
			language === 'pl'
				? 'Przyjęliśmy, Panie, dary świętej tajemnicy'
				: 'Lord, we have received the gifts of the sacred mystery'
		);
		await part
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('Rubricae generales, 115 d');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n23/mode/1up"]'
			)
		).toHaveCount(1);
	});
}

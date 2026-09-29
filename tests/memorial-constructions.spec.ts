import { expect, setHelp, test } from './fixtures';

const constructions = [
	{
		language: 'en',
		route: 'ordinarium/simili-modo',
		gloss: 'memory of Me',
		words: 2
	},
	{
		language: 'pl',
		route: 'formularium/sancti-stephani-protomartyris',
		gloss: 'pamiątkę Twoich Świętych',
		words: 3
	},
	{
		language: 'en',
		route: 'formularium/sancti-stephani-protomartyris',
		gloss: 'memory of Your Saints',
		words: 3
	},
	{
		language: 'en',
		route: 'formularium/cathedra-sancti-petri',
		gloss: 'we may experience the protection before You of him whose commemoration we celebrate',
		words: 8
	},
	{
		language: 'en',
		route: 'formularium/corporis-christi',
		gloss: 'in remembrance of Him',
		words: 3
	},
	{
		language: 'en',
		route: 'formularium/commemoratio-omnium-fidelium-defunctorum',
		gloss: 'we commemorate',
		words: 2
	}
];

for (const { language, route, gloss, words } of constructions) {
	test(`${language} ${route} keeps its memorial construction together`, async ({ page }) => {
		await page.goto(`/app/${language}/${route}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const group = page.locator('.token-group').filter({ hasText: gloss });
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
			expect(await group.boundingBox(), 'hover must not move the construction').toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card')).toHaveCount(words);
			if (route === 'ordinarium/simili-modo') {
				await expect(page.locator('aside')).toContainText(
					'Latin says literally “in memory of Me”. English preserves the same construction.'
				);
			}
			await page.keyboard.press('Escape');
			await expect(group.locator('rt')).toHaveText(gloss);
		}
	});
}

test('Polish memorial pronouns retain their possessive and correlative functions', async ({
	page
}) => {
	await page.goto('/app/pl/ordinarium/simili-modo');
	await setHelp(page, 1);
	await expect(page.locator('[id="w058"] rt')).toHaveText('moją');
	await page.goto('/app/pl/formularium/cathedra-sancti-petri');
	await expect(page.locator('[id="cathedra-sancti-petri-collecta.w056"] rt')).toHaveText('czyją');
	await expect(page.locator('[id="cathedra-sancti-petri-collecta.w059"] rt')).toHaveText('tego');
});

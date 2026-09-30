import { expect, setHelp, setTheme, test } from './fixtures';

const pairs = [
	['commemoratio-baptismatis-domini', 'evangelium', 'w045', 'to', 'w046', 'Israel'],
	['commemoratio-baptismatis-domini', 'evangelium', 'w050', 'with', 'w051', 'water'],
	['commemoratio-baptismatis-domini', 'evangelium', 'w079', 'with', 'w080', 'water'],
	['dominica-iii-post-epiphaniam', 'epistola', 'w079', 'with', 'w080', 'good']
] as const;

for (const [formulary, part, prep, prepGloss, noun, nounGloss] of pairs) {
	test(`${formulary} ${prep} keeps the preposition and noun distinct`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, colorScheme);
			for (const [word, gloss] of [
				[prep, prepGloss],
				[noun, nounGloss]
			]) {
				const button = page.locator(`button[id="${formulary}-${part}.${word}"]`);
				await expect(button.locator('rt')).toHaveText(gloss);
				await button.scrollIntoViewIfNeeded();
				const before = await button.boundingBox();
				await button.hover();
				expect(await button.boundingBox()).toEqual(before);
				await button.click();
				await expect(page.getByRole('region', { name: 'meaning in context' })).toHaveText(gloss);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
				await page.keyboard.press('Escape');
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(page.locator(`button[id="${formulary}-${part}.${prep}"] rt`)).toHaveText(
			prepGloss
		);
		await expect(page.locator(`button[id="${formulary}-${part}.${noun}"] rt`)).toHaveText(
			nounGloss
		);
	});
}

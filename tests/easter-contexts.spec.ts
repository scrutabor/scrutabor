import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

for (const language of ['pl', 'en'] as const) {
	test(`${language} Easter presents Christ as the complete Passover construction`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/dominica-resurrectionis`);
		await setHelp(page, 1);
		const group = page.locator('.token-group').filter({
			has: page.locator('button[id="dominica-resurrectionis-epistola.w015"]')
		});
		const gloss =
			language === 'pl'
				? 'Chrystus, nasza Pascha, został ofiarowany'
				: 'Christ, our Passover, has been sacrificed';
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expectSharedGloss(page, group, 5, gloss);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});

	test(`${language} Easter sequence keeps the face cloth and reconciliation distinct`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/dominica-resurrectionis`);
		await setHelp(page, 1);
		for (const [word, gloss] of [
			['w011', language === 'pl' ? 'z Ojcem' : 'to the Father'],
			['w041', language === 'pl' ? 'chustę' : 'the face cloth']
		]) {
			const button = page.locator(`button[id="dominica-resurrectionis-sequentia.${word}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await button.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.gloss')).toHaveText(gloss);
			if (word === 'w041') {
				await expect(dialog).toContainText(language === 'pl' ? 'J 20,7' : 'John 20:7');
			}
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		}
	});
}

test('English Easter prose preserves the morning and the psalm knowing state', async ({ page }) => {
	await page.goto('/app/en/formularium/dominica-resurrectionis');
	await setHelp(page, 2);
	const translation = page.locator(
		'#text-proprium-dominica-resurrectionis-evangelium .translation'
	);
	await expect(translation).toContainText('very early in the morning');
	await expect(translation).toContainText('the sun already risen');
	await page.emulateMedia({ media: 'print' });
	await expect(translation).toContainText('very early in the morning');
	await page.emulateMedia({ media: 'screen' });
	const introit = page.locator('#text-proprium-dominica-resurrectionis-introitus .translation');
	await expect(introit).toContainText('Lord, You have examined me and You know me.');
	await expect(introit).toContainText('You know when I sit down and when I rise.');
});

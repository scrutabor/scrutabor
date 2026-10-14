import { expect, setHelp, setTheme, test } from './fixtures';

const choirs = [
	['apostolorum', 's05', 'w049', 'Panowaniami'],
	['ascensionis', 's02', 'w058', 'Panowaniami'],
	['beatae-mariae-virginis-in-annuntiatione', 's06', 'w061', 'Panowania'],
	['beatae-mariae-virginis-in-assumptione', 's06', 'w061', 'Panowania'],
	['beatae-mariae-virginis-in-conceptione-immaculata', 's06', 'w062', 'Panowania'],
	['beatae-mariae-virginis-in-nativitate', 's06', 'w061', 'Panowania'],
	['beatae-mariae-virginis-in-transfixione', 's06', 'w061', 'Panowania'],
	['beatae-mariae-virginis-in-visitatione', 's06', 'w061', 'Panowania'],
	['beatae-mariae-virginis', 's06', 'w061', 'Panowania'],
	['communis', 's04', 'w033', 'Panowania'],
	['d-n-iesu-christi-regis', 's05', 'w088', 'Panowaniami'],
	['defunctorum', 's06', 'w072', 'Panowaniami'],
	['epiphaniae', 's05', 'w046', 'Panowaniami'],
	['nativitatis', 's05', 'w055', 'Panowaniami'],
	['paschalis-in-die', 's01', 'w054', 'Panowaniami'],
	['paschalis-in-nocte', 's01', 'w054', 'Panowaniami'],
	['paschalis', 's01', 'w053', 'Panowaniami'],
	['quadragesimae', 's05', 'w044', 'Panowania'],
	['sacratissimi-cordis-iesu', 's05', 'w068', 'Panowaniami'],
	['sanctae-crucis', 's05', 'w057', 'Panowania'],
	['sancti-ioseph-in-festivitate', 's06', 'w076', 'Panowania'],
	['sancti-ioseph-in-solemnitate', 's06', 'w076', 'Panowania']
] as const;

for (const [subject, segment, id, gloss] of choirs) {
	test(`@reader Polish ${subject} keeps the choir name and its case`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/pl/ordinarium/praefatio-${subject}`);
		await setHelp(page, 1);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			const token = page.locator(`button#${id}`);
			await expect(token.locator('rt')).toHaveText(gloss);
			await token.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.morph')).toContainText(
				gloss === 'Panowania' ? 'mianownik' : 'ablativus'
			);
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		}
		await setHelp(page, 2);
		await expect(page.locator(`#${segment} + .seg-extra > .translation`)).toContainText(
			gloss === 'Panowania' ? 'Panowania go uwielbiają' : 'z Tronami i Panowaniami'
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	});
}

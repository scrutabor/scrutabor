import { expect, setHelp, setTheme, test } from './fixtures';

const subjects = [
	'praefatio-beatae-mariae-virginis',
	'praefatio-beatae-mariae-virginis-in-annuntiatione',
	'praefatio-beatae-mariae-virginis-in-assumptione',
	'praefatio-beatae-mariae-virginis-in-conceptione-immaculata',
	'praefatio-beatae-mariae-virginis-in-nativitate',
	'praefatio-beatae-mariae-virginis-in-transfixione',
	'praefatio-beatae-mariae-virginis-in-visitatione',
	'praefatio-sancti-ioseph-in-festivitate',
	'praefatio-sancti-ioseph-in-solemnitate'
];

for (const subject of subjects) {
	test(`Polish ${subject} carries the opening finite construction into its praise`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/pl/ordinarium/${subject}`);
		await setHelp(page, 1);
		await expect(page.locator('#w009 rt')).toHaveText('abyśmy');
		await expect(page.locator('#w015 rt')).toHaveText('składali');
		const offset = subject.endsWith('immaculata') ? 1 : 0;
		const predicates: [number, string][] = subject.includes('sancti-ioseph')
			? [[29, 'uwielbiali']]
			: [[30 + offset, 'wysławiali']];
		predicates.push([31 + offset, 'błogosławili'], [33 + offset, 'głosili']);
		for (const [width, theme] of [
			[390, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			for (const [number, gloss] of predicates) {
				const word = page.locator(`#w${String(number).padStart(3, '0')}`);
				await expect(word.locator('rt')).toHaveText(gloss);
				await word.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				await expect(word.locator('rt')).toBeInViewport();
				const before = await word.boundingBox();
				await word.hover();
				expect(await word.boundingBox()).toEqual(before);
				await word.click();
				const panel = page.locator('aside');
				await expect(panel.locator('.context-layer > .gloss')).toHaveText(gloss);
				await expect(panel.locator('.morph')).toContainText('bezokolicznik');
				await page.keyboard.press('Escape');
				await expect(panel).toHaveCount(0);
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});
}

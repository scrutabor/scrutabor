import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const text = 'dominica-vii-post-pentecosten-secreta';
const route = '/app/en/formularium/dominica-vii-post-pentecosten';
const constructions = [
	[
		'w009',
		7,
		'through the perfection of one sacrifice have confirmed the varied sacrifices of the Law'
	],
	['w015', 3, 'servants devoted to You'],
	['w022', 6, 'sanctify it with the same blessing You bestowed on the gifts of Abel'],
	['w030', 3, 'the honor of Your majesty'],
	['w032', 4, 'may contribute to the salvation of all'],
	['w036', 2, 'our Lord'],
	['w040', 2, 'Your Son'],
	['w049', 2, 'of the Holy Spirit'],
	['w054', 4, 'forever and ever']
] as const;

for (const [anchor, count, gloss] of constructions) {
	test(`English Pentecost Secret ${anchor} retains its whole construction`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const group = page
			.locator('.token-group')
			.filter({ has: page.locator(`button[id="${text}.${anchor}"]`) });
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expectSharedGloss(page, group, count, gloss);
			const [geometry] = await group.evaluate(interlinearGeometry);
			expect(geometry.clearance, 'the caption follows every Latin member').toBeGreaterThanOrEqual(
				0
			);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});
}

test('English Pentecost Secret preserves direct words and its complete prose', async ({ page }) => {
	await page.goto(route);
	await setHelp(page, 1);
	const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
	await expect(part.locator('.token')).toHaveCount(56);
	for (const [word, gloss] of [
		['w002', 'who'],
		['w027', 'for'],
		['w042', 'who'],
		['w056', 'Amen']
	]) {
		await expect(part.locator(`[id="${text}.${word}"] rt`)).toHaveText(gloss);
	}
	await setHelp(page, 2);
	await expect(part).toContainText('receive the sacrifice from servants devoted to You');
	await expect(part).toContainText(
		'sanctify it with the same blessing You bestowed on the gifts of Abel'
	);
	await expect(part).toContainText('may contribute to the salvation of all');
	await expect(part).toContainText('in the unity of the Holy Spirit, God,');
	await expect(part).toContainText('forever and ever.');
	await expect(part).toContainText('Amen.');
});

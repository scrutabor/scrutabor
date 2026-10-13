import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

// Contextual expectations are literal, not derived from the data under test.
const cases = [
	['en', 'communicantes', 3, 'memoria veneror', 'venerating the memory'],
	['en', 'communicantes', 14, 'dominus noster', 'our Lord'],
	['en', 'communicantes', 22, 'idem virgo sponsus', 'Spouse of the same Virgin'],
	[
		'en',
		'communicantes',
		26,
		'beatus apostolus ac martyr tuus',
		'of Your blessed apostles and martyrs'
	],
	['en', 'communicantes', 60, 'omnis sanctus tuus', 'of all Your saints'],
	['en', 'communicantes', 63, 'qui meritum prex', 'through whose merits and prayers'],
	[
		'en',
		'communicantes',
		70,
		'protectio tuus munio auxilium',
		'we may be defended by the help of Your protection'
	],
	['en', 'communicantes', 77, 'dominus noster', 'our Lord'],
	[
		'pl',
		'communicantes',
		70,
		'protectio tuus munio auxilium',
		'byli bronieni pomocą Twojej opieki'
	],
	['pl', 'communicantes-in-cena-domini', 3, 'dies sacratus celebro', 'obchodząc najświętszy dzień']
] as const;

for (const [language, slug, first, lemmata, caption] of cases) {
	test(`${language} ${slug} ${first} preserves its shared caption @reader`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const members = lemmata.split(' ').map((lemma, offset) => ({
			id: `w${String(first + offset).padStart(3, '0')}`,
			href: `/app/${language}/lemma?l=${lemma}`
		}));
		const group = page
			.locator('.token-group')
			.filter({ has: page.locator(`[id="${members[0].id}"]`) });
		for (const width of [320, 1280]) {
			for (const theme of ['light', 'dark'] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/ordinarium/${slug}`);
				await setHelp(page, 1);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				await expectSharedGloss(page, group, members.length, caption, members, {
					neighborInk: true
				});
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.setViewportSize({ width: 794, height: 1123 });
		await page.emulateMedia({ media: 'print' });
		await expect(group.locator('rt')).toBeVisible();
		await expect(group.locator('rt')).toHaveText(caption);
		await expect(group.locator('.token')).toHaveCount(members.length);
		const [geometry] = await group.evaluate(interlinearGeometry);
		expect(geometry.sourceClipping).toEqual([]);
		expect(geometry.captionClipping).toEqual([]);
		expect(geometry.clearance).toBeGreaterThanOrEqual(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		await page.emulateMedia({ media: 'screen' });
	});
}

import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

// Each expectation preserves the complete contextual construction, not just its verb.
const subjects: Record<string, [string, number, string][]> = {
	apostolorum: [
		['w031', 4, 'that it may be governed by those same leaders'],
		['w037', 8, 'whom You appointed to preside over it as shepherds, deputies in Your work']
	],
	ascensionis: [['w046', 7, 'that He might grant us a share in His divinity']],
	epiphaniae: [['w036', 6, 'He renewed us by the new light of His immortality']],
	nativitatis: [['w034', 8, 'a new light of Your glory has shone upon the eyes of our mind']],
	'paschalis-in-die': [['w024', 6, 'for Christ, our Passover, has been sacrificed']],
	'paschalis-in-nocte': [['w024', 6, 'for Christ, our Passover, has been sacrificed']],
	'd-n-iesu-christi-regis': [
		['w054', 5, 'with all creatures subjected to His dominion'],
		['w064', 8, 'He might deliver to Your infinite Majesty an eternal and universal kingdom']
	],
	'sanctissimae-trinitatis': [['w051', 2, 'by Your revelation']],
	'sancti-ioseph-in-festivitate': [['w063', 2, 'in a father’s place']],
	'sancti-ioseph-in-solemnitate': [['w063', 2, 'in a father’s place']]
};

for (const [subject, groups] of Object.entries(subjects)) {
	test(`English ${subject} presents complete constructions with every member accessible`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/en/ordinarium/praefatio-${subject}`);
		await setHelp(page, 1);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			for (const [anchor, count, gloss] of groups) {
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`button#${anchor}`) });
				await expectSharedGloss(page, group, count, gloss);
				if (width === 320 && count >= 4) {
					// Closing a word card may still restore the document's scroll
					// position. Compare both boxes in one layout snapshot, so a
					// viewport movement cannot masquerade as overlapping text.
					const [geometry] = await group.evaluate(interlinearGeometry);
					expect(
						geometry.sourceHeight > geometry.sourceLeading * 1.5 ||
							geometry.captionHeight > geometry.captionLeading * 1.5
					).toBe(true);
					const clearance = geometry.clearance;
					expect(clearance, 'a wrapped caption follows all its Latin words').toBeGreaterThanOrEqual(
						0
					);
				}
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});
}

for (const [subject, occasion] of [
	['paschalis-in-die', 'day'],
	['paschalis-in-nocte', 'night']
] as const) {
	test(`English Easter ${occasion} preserves its occasion in the continuous translation`, async ({
		page
	}) => {
		await page.goto(`/app/en/ordinarium/praefatio-${subject}`);
		await setHelp(page, 2);
		await expect(page.locator('.translation')).toContainText(
			`on this ${occasion} above all, for Christ, our Passover, has been sacrificed.`
		);
	});
}

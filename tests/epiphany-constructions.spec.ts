import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-ii-post-epiphaniam';
const constructions = [
	{
		language: 'en',
		text: 'proprium/dominica-ii-post-epiphaniam-epistola',
		first: 3,
		lemmata: ['donatio', 'secundum', 'gratia', 'qui', 'do', 'sum', 'nos', 'differo'],
		gloss: 'different gifts according to the grace given to us'
	},
	{
		language: 'pl',
		text: 'proprium/dominica-ii-post-epiphaniam-evangelium',
		first: 68,
		lemmata: ['capio', 'singulus', 'metreta', 'binus', 'vel', 'ternus'],
		gloss: 'z których każda mieściła po dwie albo trzy miary'
	}
] as const;

for (const { language, text, first, lemmata, gloss } of constructions) {
	const members = lemmata.map((lemma, offset) => {
		const cardId = `w${String(first + offset).padStart(3, '0')}`;
		return {
			id: `${text.split('/')[1]}.${cardId}`,
			cardId,
			href: `/app/${language}/lemma?l=${lemma}`
		};
	});
	for (const width of [320, 1280]) {
		for (const theme of ['light', 'dark'] as const) {
			test(`${language} ${text} remains readable at ${width} in ${theme} @reader`, async ({
				page
			}) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}`);
				await setHelp(page, 1);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`button[id="${members[0].id}"]`) });
				await expectSharedGloss(page, group, members.length, gloss, members, {
					neighborInk: true,
					requirePrecedingRow: language === 'pl'
				});
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				if (width === 320) {
					expect(geometry.sourceInk.rows > 1 || geometry.captionInk.rows > 1).toBe(true);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			});
		}
	}
}

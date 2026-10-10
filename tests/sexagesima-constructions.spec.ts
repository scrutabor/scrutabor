import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-in-sexagesima';
const cases = [
	{
		language: 'pl',
		part: 'epistola',
		first: 344,
		lemmata: ['qui', 'ego', 'colaphizo'],
		gloss: 'aby mnie policzkował'
	},
	{
		language: 'pl',
		part: 'tractus',
		first: 15,
		lemmata: ['ab', 'facies'],
		gloss: 'przed'
	},
	{
		language: 'pl',
		part: 'evangelium',
		first: 141,
		lemmata: ['qui', 'supra', 'petra', 'qui'],
		gloss: 'ci na skale to ci, którzy'
	},
	{
		language: 'en',
		part: 'collecta',
		first: 13,
		lemmata: ['contra', 'adversus', 'omnis', 'doctor', 'gens', 'protectio', 'munio'],
		gloss:
			'we may be strengthened against all adversity by the protection of the Doctor of the Gentiles'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 87,
		lemmata: ['ab', 'Iudaeus', 'quinquies', 'quadrageni', 'unus', 'minus', 'accipio'],
		gloss: 'Five times I received from the Jews forty blows less one'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 104,
		lemmata: ['nox', 'et', 'dies', 'in', 'profundus', 'mare', 'sum'],
		gloss: 'I spent a night and a day in the depths of the sea'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 175,
		lemmata: ['ab', 'sollicitudo', 'et', 'divitiae', 'et', 'voluptas', 'vita', 'eo', 'suffoco'],
		gloss: 'as they go on their way, are choked by the cares, riches and pleasures of life'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of cases) {
	test(`${language} Sexagesima ${part} ${first} preserves its complete construction @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const members = lemmata.map((lemma, offset) => {
			const cardId = `w${String(first + offset).padStart(3, '0')}`;
			return { id: `${day}-${part}.${cardId}`, cardId, href: `/app/${language}/lemma?l=${lemma}` };
		});
		for (const width of [320, 1280]) {
			for (const theme of ['light', 'dark'] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}`);
				await setHelp(page, 1);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`[id="${members[0].id}"]`) });
				await expectSharedGloss(page, group, members.length, gloss, members, { neighborInk: true });
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		if (language === 'en') {
			await page.setViewportSize({ width: 794, height: 1123 });
			const group = page
				.locator('.token-group')
				.filter({ has: page.locator(`[id="${members[0].id}"]`) });
			await page.emulateMedia({ media: 'print' });
			await expect(group.locator('rt')).toBeVisible();
			await expect(group.locator('rt')).toHaveText(gloss);
			await expect(group.locator('.token')).toHaveCount(members.length);
			const [geometry] = await group.evaluate(interlinearGeometry);
			expect(geometry.sourceClipping).toEqual([]);
			expect(geometry.captionClipping).toEqual([]);
			expect(geometry.clearance).toBeGreaterThanOrEqual(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
			await page.emulateMedia({ media: 'screen' });
		}
	});
}

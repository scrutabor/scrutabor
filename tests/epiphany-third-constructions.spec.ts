import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

const day = 'dominica-iii-post-epiphaniam';
const cases = [
	{
		language: 'pl',
		part: 'evangelium',
		first: 38,
		lemmata: ['mundo', 'sum', 'lepra', 'is'],
		gloss: 'został oczyszczony z trądu'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 46,
		lemmata: ['video', 'nemo', 'dico'],
		gloss: 'See that you tell no one'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 78,
		lemmata: ['vinco', 'in', 'bonum', 'malum'],
		gloss: 'overcome evil with good'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of cases) {
	test(`${language} third Epiphany ${part} keeps the complete ${first} construction @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const members = lemmata.map((lemma, offset) => {
			const cardId = `w${String(first + offset).padStart(3, '0')}`;
			return {
				id: `${day}-${part}.${cardId}`,
				cardId,
				href: `/app/${language}/lemma?l=${lemma}`
			};
		});
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/app/${language}/formularium/${day}`);
			await setHelp(page, 1);
			await setTheme(page, theme);
			await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
			expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
			const group = page
				.locator('.token-group')
				.filter({ has: page.locator(`button[id="${members[0].id}"]`) });
			await expectSharedGloss(page, group, members.length, gloss, members, {
				neighborInk: true
			});
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});
}

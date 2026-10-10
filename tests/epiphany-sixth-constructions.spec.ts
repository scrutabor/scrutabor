import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-vi-post-epiphaniam';
const cases = [
	{
		language: 'pl',
		part: 'collecta',
		first: 9,
		lemmata: ['qui', 'tu', 'sum', 'placeo', 'et', 'dico', 'exsequor', 'et', 'facio'],
		gloss: 'wypełniali to, co Tobie miłe, i słowami, i czynami'
	},
	{
		language: 'en',
		part: 'collecta',
		first: 9,
		lemmata: ['qui', 'tu', 'sum', 'placeo', 'et', 'dico', 'exsequor', 'et', 'facio'],
		gloss: 'we may carry out what is pleasing to You, both in words and in deeds'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 119,
		lemmata: [
			'in',
			'omnis',
			'locus',
			'fides',
			'vester',
			'qui',
			'sum',
			'ad',
			'deus',
			'proficiscor',
			'sum'
		],
		gloss: 'your faith, which is directed toward God, has spread everywhere'
	},
	{
		language: 'pl',
		part: 'evangelium',
		first: 58,
		lemmata: ['qui', 'accipio', 'mulier', 'abscondo'],
		gloss: 'który kobieta wzięła i ukryła'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 63,
		lemmata: ['farina', 'satum', 'tres'],
		gloss: 'three measures of flour'
	},
	{
		language: 'en',
		part: 'secreta',
		first: 1,
		lemmata: ['hic', 'nos', 'oblatio', 'deus', 'mundo', 'quaeso'],
		gloss: 'May this offering, O God, we beseech You, cleanse us'
	},
	{
		language: 'pl',
		part: 'postcommunio',
		first: 6,
		lemmata: ['ut', 'semper', 'idem', 'per', 'qui', 'veraciter', 'vivo', 'appeto'],
		gloss: 'abyśmy zawsze pragnęli tego samego, przez co prawdziwie żyjemy'
	},
	{
		language: 'en',
		part: 'postcommunio',
		first: 6,
		lemmata: ['ut', 'semper', 'idem', 'per', 'qui', 'veraciter', 'vivo', 'appeto'],
		gloss: 'that we may always desire those same things by which we truly live'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of cases) {
	test(`${language} sixth Epiphany ${part} ${first} preserves its complete construction @reader`, async ({
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
	});
}

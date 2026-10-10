import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-in-septuagesima';
const cases = [
	{
		language: 'en',
		part: 'epistola',
		first: 37,
		lemmata: ['nos', 'autem', 'incorruptus'],
		gloss: 'but we do so to receive an imperishable one'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 10,
		lemmata: ['similis', 'sum', 'regnum', 'caelum', 'homo', 'paterfamilias'],
		gloss: 'The kingdom of heaven is like a householder'
	},
	{
		language: 'en',
		part: 'introitus',
		first: 1,
		lemmata: ['circumdo', 'ego', 'gemitus', 'mors'],
		gloss: 'The groans of death surrounded me'
	},
	{
		language: 'en',
		part: 'introitus',
		first: 57,
		lemmata: ['circumdo', 'ego', 'gemitus', 'mors'],
		gloss: 'The groans of death surrounded me'
	},
	{
		language: 'en',
		part: 'collecta',
		first: 1,
		lemmata: ['prex', 'populus', 'tuus', 'quaeso', 'dominus', 'clementer', 'exaudio'],
		gloss: 'We beseech You, O Lord, graciously hear the prayers of Your people'
	},
	{
		language: 'pl',
		part: 'epistola',
		first: 62,
		lemmata: ['ne', 'forte', 'cum', 'alius', 'praedico', 'ipse', 'reprobus', 'efficio'],
		gloss: 'abym przypadkiem, głosiwszy innym naukę, sam nie został odrzucony'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 121,
		lemmata: ['non', 'in', 'multus', 'is', 'beneplaceo', 'sum', 'deus'],
		gloss: 'God was not pleased with most of them'
	},
	{
		language: 'en',
		part: 'graduale',
		first: 27,
		lemmata: ['non', 'pereo', 'in', 'aeternus'],
		gloss: 'will never perish'
	},
	{
		language: 'pl',
		part: 'tractus',
		first: 20,
		lemmata: ['iniquitas', 'observo'],
		gloss: 'będziesz zważał na nieprawości'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 131,
		lemmata: [
			'cum',
			'venio',
			'ergo',
			'qui',
			'circa',
			'undecimus',
			'hora',
			'venio',
			'accipio',
			'singulus',
			'denarius'
		],
		gloss: 'When those who had arrived about the eleventh hour came, they received a denarius each'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 202,
		lemmata: ['volo', 'autem', 'et', 'hic', 'novissimus', 'do', 'sicut', 'et', 'tu'],
		gloss: 'but I want to give this last worker the same as you'
	},
	{
		language: 'en',
		part: 'offertorium',
		first: 7,
		lemmata: ['nomen', 'tuus'],
		gloss: 'to Your name'
	},
	{
		language: 'en',
		part: 'communio',
		first: 15,
		lemmata: ['non', 'confundo'],
		gloss: 'let me not be put to shame'
	},
	{
		language: 'pl',
		part: 'postcommunio',
		first: 8,
		lemmata: [
			'ut',
			'idem',
			'et',
			'percipio',
			'requiro',
			'et',
			'quaero',
			'sine',
			'finis',
			'percipio'
		],
		gloss:
			'aby zarówno szukali tych samych darów, przyjmując je, jak i przyjmowali je bez końca, szukając ich'
	},
	{
		language: 'en',
		part: 'postcommunio',
		first: 8,
		lemmata: [
			'ut',
			'idem',
			'et',
			'percipio',
			'requiro',
			'et',
			'quaero',
			'sine',
			'finis',
			'percipio'
		],
		gloss:
			'that they may both seek those same gifts by receiving them, and receive them without end by seeking them'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of cases) {
	test(`${language} Septuagesima ${part} ${first} preserves its complete construction @reader`, async ({
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
		if (language === 'en' && part === 'epistola' && first === 37) {
			const group = page
				.locator('.token-group')
				.filter({ has: page.locator(`[id="${members[0].id}"]`) });
			await page.emulateMedia({ media: 'print' });
			await expect(group.locator('rt')).toBeVisible();
			await expect(group.locator('rt')).toHaveText(gloss);
			await expect(group.locator('.token')).toHaveCount(members.length);
			await page.emulateMedia({ media: 'screen' });
		}
	});
}

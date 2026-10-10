import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-v-post-epiphaniam';
const cases = [
	{
		language: 'en',
		part: 'collecta',
		first: 1,
		lemmata: ['familia', 'tuus', 'quaeso', 'dominus', 'continuus', 'pietas', 'custodio'],
		gloss: 'Guard Your household, we beseech You, Lord, with continual loving-kindness'
	},
	{
		language: 'pl',
		part: 'collecta',
		first: 16,
		lemmata: ['tuus', 'semper', 'protectio', 'munio'],
		gloss: 'zawsze była umocniona Twoją opieką'
	},
	{
		language: 'en',
		part: 'epistola',
		first: 63,
		lemmata: ['verbum', 'Christus', 'habito'],
		gloss: 'May Christ’s word dwell'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 89,
		lemmata: ['eradico', 'simul', 'cum', 'is', 'et', 'triticum'],
		gloss: 'you also uproot the wheat along with it'
	},
	{
		language: 'pl',
		part: 'secreta',
		first: 13,
		lemmata: ['nuto', 'cor', 'tu', 'dirigo'],
		gloss: 'sam pokierował chwiejnymi sercami'
	},
	{
		language: 'en',
		part: 'secreta',
		first: 6,
		lemmata: ['ut', 'et', 'delictum', 'noster', 'miseror', 'absolvo'],
		gloss: 'so that You may both mercifully absolve our faults'
	},
	{
		language: 'pl',
		part: 'postcommunio',
		first: 9,
		lemmata: ['qui', 'per', 'hic', 'mysterium', 'pignus', 'accipio'],
		gloss: 'którego zadatek otrzymaliśmy przez te tajemnice'
	},
	{
		language: 'en',
		part: 'postcommunio',
		first: 9,
		lemmata: ['qui', 'per', 'hic', 'mysterium', 'pignus', 'accipio'],
		gloss: 'whose pledge we have received through these mysteries'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of cases) {
	test(`${language} fifth Epiphany ${part} ${first} preserves its complete construction @reader`, async ({
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

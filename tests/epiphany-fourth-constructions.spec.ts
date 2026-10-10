import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-iv-post-epiphaniam';
const constructions = [
	{
		language: 'pl',
		part: 'epistola',
		first: 22,
		lemmata: ['non', 'falsus', 'testimonium', 'dico'],
		gloss: 'Nie mów fałszywego świadectwa'
	},
	{
		language: 'pl',
		part: 'postcommunio',
		first: 10,
		lemmata: ['caelestis', 'semper', 'instauro', 'alimentum'],
		gloss: 'zawsze odnawiają niebieskimi pokarmami'
	},
	{
		language: 'en',
		part: 'collecta',
		first: 22,
		lemmata: ['is', 'qui', 'pro', 'peccatum', 'noster', 'patior', 'tu', 'adiuvo', 'vinco'],
		gloss: 'with Your help we may overcome what we suffer for our sins'
	},
	{
		language: 'en',
		part: 'evangelium',
		first: 48,
		lemmata: ['timidus', 'sum', 'modicus', 'fides'],
		gloss: 'are you fearful, you of little faith'
	},
	{
		language: 'en',
		part: 'secreta',
		first: 10,
		lemmata: ['fragilitas', 'noster', 'ab', 'omnis', 'malum', 'purgo', 'semper'],
		gloss: 'may always cleanse our frailty from all evil'
	},
	{
		language: 'en',
		part: 'postcommunio',
		first: 3,
		lemmata: ['nos', 'deus', 'ab', 'delectatio', 'terrenus', 'expedio'],
		gloss: 'may free us, O God, from earthly delights'
	}
] as const;

for (const { language, part, first, lemmata, gloss } of constructions) {
	const members = lemmata.map((lemma, offset) => {
		const cardId = `w${String(first + offset).padStart(3, '0')}`;
		return {
			id: `${day}-${part}.${cardId}`,
			cardId,
			href: `/app/${language}/lemma?l=${lemma}`
		};
	});
	for (const width of [320, 1280]) {
		for (const theme of ['light', 'dark'] as const) {
			test(`${language} fourth Epiphany ${part} ${first} at ${width} ${theme} @reader`, async ({
				page
			}) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}`);
				await setHelp(page, 1);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`[id="${members[0].id}"]`) });
				await expectSharedGloss(page, group, members.length, gloss, members, {
					neighborInk: true
				});
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			});
		}
	}
}

const whyNotes = {
	pl: 'Quid jest biernikiem liczby pojedynczej rodzaju nijakiego zaimka quis, użytym pytająco w znaczeniu „dlaczego”. Nie jest dopełnieniem oznaczającym rzecz, której uczniowie się boją.',
	en: 'Quid is the neuter singular accusative of the pronoun quis, used interrogatively to mean “why”. It is not an object naming something the disciples fear.'
} as const;

for (const language of ['pl', 'en'] as const) {
	for (const width of [320, 1280]) {
		for (const theme of ['light', 'dark'] as const) {
			test(`${language} fourth Epiphany why is a neuter pronoun at ${width} ${theme}`, async ({
				page
			}) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}`);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				await page.locator(`button[id="${day}-evangelium.w047"]`).click();
				const panel = page.getByRole('dialog');
				await expect(panel.locator('.form')).toHaveText('Quid');
				await expect(panel.locator('.context-layer > .gloss')).toHaveText(
					language === 'pl' ? 'Czemu' : 'Why'
				);
				await expect(panel.locator('.morph')).toContainText(
					language === 'pl' ? 'r.\u00a0nijaki' : 'neuter'
				);
				await expect(panel.locator('.context-layer > .explanation')).toHaveText(whyNotes[language]);
				await expect(panel.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				expect(
					await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			});
		}
	}
}

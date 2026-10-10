import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const text = 'in-octava-nativitatis-secreta';
const opening = ['munus', 'noster', 'quaeso', 'dominus', 'prex', 'suscipio'];
const cleansing = ['caelestis', 'nos', 'mundo', 'mysterium'];

for (const day of ['in-octava-nativitatis', 'dominica-in-septuagesima']) {
	for (const language of ['pl', 'en'] as const) {
		test(`${language} ${day} preserves the shared Secret construction @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			const cases = [
				{
					first: 1,
					lemmata: opening,
					gloss:
						language === 'pl'
							? 'Prosimy, Panie: przyjąwszy nasze dary i modlitwy,'
							: 'We beseech You, Lord: having received our gifts and prayers,'
				},
				{
					first: language === 'pl' ? 7 : 8,
					lemmata: language === 'pl' ? ['et', ...cleansing] : cleansing,
					gloss:
						language === 'pl'
							? 'oczyść nas niebieskimi misteriami'
							: 'cleanse us by the heavenly mysteries'
				}
			];
			for (const width of [320, 1280]) {
				for (const theme of ['light', 'dark'] as const) {
					await page.setViewportSize({ width, height: 900 });
					await page.goto(`/app/${language}/formularium/${day}`);
					await setHelp(page, 1);
					await setTheme(page, theme);
					await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
					expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
					const section = page.locator(`#text-proprium-${text}`);
					await expect(section.locator('.token')).toHaveCount(36);
					for (const { first, lemmata, gloss } of cases) {
						const members = lemmata.map((lemma, offset) => {
							const cardId = `w${String(first + offset).padStart(3, '0')}`;
							return { id: `${text}.${cardId}`, cardId, href: `/app/${language}/lemma?l=${lemma}` };
						});
						const group = section.locator('.token-group').filter({
							has: page.locator(`[id="${members[0].id}"]`)
						});
						await expectSharedGloss(page, group, members.length, gloss, members, {
							neighborInk: true
						});
						const [geometry] = await group.evaluate(interlinearGeometry);
						expect(geometry.sourceClipping).toEqual([]);
						expect(geometry.captionClipping).toEqual([]);
						expect(geometry.clearance).toBeGreaterThanOrEqual(0);
					}
					for (const [word, gloss] of [
						['w012', language === 'pl' ? 'i' : 'and'],
						['w013', language === 'pl' ? 'łaskawie' : 'mercifully'],
						['w014', language === 'pl' ? 'wysłuchaj' : 'hear'],
						['w036', 'Amen']
					]) {
						await expect(section.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
					}
					if (language === 'en') {
						await expect(section.locator(`button[id="${text}.w007"] rt`)).toHaveText('both');
					}
					expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
						0
					);
				}
			}
		});
	}
}

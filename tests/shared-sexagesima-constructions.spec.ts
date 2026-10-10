import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

type Construction = { first: number; lemmata: readonly string[]; gloss: string };
const postcommunion = {
	text: 'dominica-i-post-epiphaniam-postcommunio',
	parents: ['dominica-i-post-epiphaniam', 'dominica-in-sexagesima', 'dominica-ii-in-quadragesima'],
	pl: [
		{
			first: 8,
			lemmata: ['tuus', 'reficio', 'sacramentum'],
			gloss: 'pokrzepiasz swoimi sakramentami'
		},
		{
			first: 11,
			lemmata: ['tu', 'etiam', 'placeo', 'mos', 'dignanter', 'deservio', 'concedo'],
			gloss: 'łaskawie pozwolił także służyć Tobie miłym życiem'
		}
	],
	en: [
		{ first: 2, lemmata: ['tu', 'rogo'], gloss: 'we beseech You' },
		{
			first: 7,
			lemmata: [
				'qui',
				'tuus',
				'reficio',
				'sacramentum',
				'tu',
				'etiam',
				'placeo',
				'mos',
				'dignanter',
				'deservio',
				'concedo'
			],
			gloss:
				'You may graciously allow those whom You refresh with Your sacraments to serve You also by pleasing conduct'
		}
	]
};
const offertory = {
	text: 'dominica-vi-post-pentecosten-offertorium',
	parents: ['dominica-vi-post-pentecosten', 'dominica-in-sexagesima'],
	pl: [
		{ first: 23, lemmata: ['salvus', 'facio'], gloss: 'ocalasz' },
		{ first: 26, lemmata: ['in', 'tu'], gloss: 'Tobie' }
	],
	en: [
		{ first: 1, lemmata: ['perficio', 'gressus', 'meus'], gloss: 'Make my steps steadfast' },
		{ first: 5, lemmata: ['semita', 'tuus'], gloss: 'Your paths' },
		{
			first: 8,
			lemmata: ['non', 'moveo', 'vestigium', 'meus'],
			gloss: 'my footsteps may not be moved'
		},
		{ first: 13, lemmata: ['auris', 'tuus'], gloss: 'Your ear' },
		{ first: 17, lemmata: ['verbum', 'meus'], gloss: 'my words' },
		{
			first: 19,
			lemmata: ['mirifico', 'misericordia', 'tuus'],
			gloss: 'Show Your wondrous mercies'
		},
		{ first: 23, lemmata: ['salvus', 'facio'], gloss: 'save' }
	]
};

for (const text of [postcommunion, offertory]) {
	for (const parent of text.parents) {
		for (const language of ['pl', 'en'] as const) {
			test(`${language} ${parent} retains shared ${text.text} constructions @reader`, async ({
				page
			}) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				const constructions: readonly Construction[] = text[language];
				for (const width of [320, 1280]) {
					for (const theme of ['light', 'dark'] as const) {
						await page.setViewportSize({ width, height: 900 });
						await page.goto(`/app/${language}/formularium/${parent}`);
						await setHelp(page, 1);
						await setTheme(page, theme);
						await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
						expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
						for (const construction of constructions) {
							const members = construction.lemmata.map((lemma, offset) => {
								const cardId = `w${String(construction.first + offset).padStart(3, '0')}`;
								return {
									id: `${text.text}.${cardId}`,
									cardId,
									href: `/app/${language}/lemma?l=${lemma}`
								};
							});
							const group = page
								.locator('.token-group')
								.filter({ has: page.locator(`[id="${members[0].id}"]`) });
							await expectSharedGloss(page, group, members.length, construction.gloss, members, {
								neighborInk: true
							});
							const [geometry] = await group.evaluate(interlinearGeometry);
							expect(geometry.sourceClipping).toEqual([]);
							expect(geometry.captionClipping).toEqual([]);
							expect(geometry.clearance).toBeGreaterThanOrEqual(0);
						}
						expect(
							await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
						).toBe(0);
					}
				}
				// Both long target-language constructions must also fit print media.
				await page.setViewportSize({ width: 794, height: 1123 });
				await page.emulateMedia({ media: 'print' });
				for (const construction of constructions) {
					const first = `${text.text}.w${String(construction.first).padStart(3, '0')}`;
					const group = page
						.locator('.token-group')
						.filter({ has: page.locator(`[id="${first}"]`) });
					await expect(group.locator('rt')).toHaveText(construction.gloss);
					await expect(group.locator('rt')).toBeVisible();
					await expect(group.locator('.token')).toHaveCount(construction.lemmata.length);
					const [geometry] = await group.evaluate(interlinearGeometry);
					expect(geometry.sourceClipping).toEqual([]);
					expect(geometry.captionClipping).toEqual([]);
					expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				await page.emulateMedia({ media: 'screen' });
			});
		}
	}
}

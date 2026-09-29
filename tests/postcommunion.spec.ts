import { expect, setHelp, test } from './fixtures';

const prayers = [
	{
		sunday: 'xxii',
		response: 'w037',
		conclusion: { section: '115 d', leaf: 23 },
		opening: {
			pl: 'Przyjęliśmy, Panie, dary świętej tajemnicy',
			en: 'Lord, we have received the gifts of the sacred mystery'
		},
		constructions: [
			{ language: 'pl', gloss: 'dary świętego misterium', words: 3 },
			{ language: 'pl', gloss: 'przyniosło pomoc w naszej słabości', words: 5 },
			{ language: 'en', gloss: 'the gifts of the sacred mystery', words: 3 },
			{ language: 'en', gloss: 'You commanded us to do in remembrance of You', words: 6 },
			{ language: 'en', gloss: 'may help us in our weakness', words: 5 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 },
			{ language: 'en', gloss: 'forever and ever', words: 4 }
		]
	},
	{
		sunday: 'xiii',
		response: 'w032',
		conclusion: { section: '115 a', leaf: 22 },
		opening: {
			pl: 'Przyjąwszy, Panie, niebieskie sakramenty, prosimy, abyśmy coraz pełniej dostępowali wiecznego odkupienia.',
			en: 'Lord, having received the heavenly mysteries, we pray that we may advance toward a fuller share in eternal redemption.'
		},
		constructions: [
			{
				language: 'pl',
				gloss: 'prosimy, abyśmy coraz pełniej dostępowali wiecznego odkupienia',
				words: 6
			},
			{
				language: 'en',
				gloss: 'we pray that we may advance toward a fuller share in eternal redemption',
				words: 6
			},
			{ language: 'en', gloss: 'our Lord', words: 2 },
			{ language: 'en', gloss: 'Your Son', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 }
		]
	}
] as const;

for (const { sunday, response, conclusion, opening, constructions } of prayers) {
	const route = `formularium/dominica-${sunday}-post-pentecosten`;
	const text = `dominica-${sunday}-post-pentecosten-postcommunio`;

	for (const { language, gloss, words } of constructions) {
		test(`${language} ${sunday} postcommunion preserves ${gloss}`, async ({ page }) => {
			await page.goto(`/app/${language}/${route}`);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			await setHelp(page, 1);
			const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
			const group = part.locator('.token-group').filter({ hasText: gloss });
			await expect(group).toHaveCount(1);
			await expect(group.locator('rt')).toHaveText(gloss);
			await expect(group.locator('.token')).toHaveCount(words);
			const button = group.locator(':scope > button');
			await expect(button).toHaveCount(1);
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				await group.scrollIntoViewIfNeeded();
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
				const before = await group.boundingBox();
				await button.hover();
				expect(await group.boundingBox()).toEqual(before);
				await button.click();
				await expect(page.locator('aside .construction-card')).toHaveCount(words);
				await page.keyboard.press('Escape');
				await expect(group.locator('rt')).toHaveText(gloss);
			}
			const source = await group.locator('.base').allTextContents();
			expect(source).toHaveLength(words);
			await page.emulateMedia({ media: 'print' });
			for (const width of [375, 760]) {
				await page.setViewportSize({ width, height: 900 });
				await expect(group.locator('rt')).toBeVisible();
				await expect(group.locator('rt')).toHaveText(gloss);
				expect(await group.locator('.base').allTextContents()).toEqual(source);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
			}
			await page.emulateMedia({ media: 'screen' });
			await expect(button).toBeVisible();
		});
	}

	for (const language of ['pl', 'en'] as const) {
		test(`${language} ${sunday} postcommunion preserves its text, response and source`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/${route}`);
			await setHelp(page, 1);
			if (sunday === 'xxii')
				await expect(page.locator(`[id="${text}.w009"] rt`)).toHaveText(
					language === 'pl' ? 'to, co' : 'what'
				);
			await expect(page.locator(`[id="${text}.${response}"] rt`)).toHaveText('Amen');
			await setHelp(page, 2);
			const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
			await expect(part).toContainText(opening[language]);
			await part
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const sources = page.getByRole('dialog').locator('details.source-notes');
			await sources.locator('summary').click();
			await expect(sources).toContainText(`Rubricae generales, ${conclusion.section}`);
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${conclusion.leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		});
	}
}

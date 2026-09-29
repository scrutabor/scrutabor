import { expect, setHelp, test } from './fixtures';

const prayers = [
	{
		formulary: 'dominica-iv-post-epiphaniam',
		kind: 'collecta',
		response: 'w052',
		conclusion: { section: '115 a', leaf: 22 },
		opening: {
			pl: 'Boże, który wiesz, że pośród tak wielkich niebezpieczeństw',
			en: 'O God, You know that amid such great dangers we cannot stand firm because of human frailty.'
		},
		constructions: [
			{
				language: 'pl',
				gloss:
					'wiesz, że my, postawieni pośród tak wielkich niebezpieczeństw, z powodu ludzkiej słabości nie możemy się ostać',
				words: 12
			},
			{ language: 'pl', gloss: 'z Twoją pomocą', words: 2 },
			{
				language: 'en',
				gloss:
					'know that we, placed amid such great dangers, cannot stand firm because of human frailty',
				words: 12
			},
			{ language: 'en', gloss: 'our sins', words: 2 },
			{ language: 'en', gloss: 'with Your help', words: 2 },
			{ language: 'en', gloss: 'our Lord', words: 2 },
			{ language: 'en', gloss: 'Your Son', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 },
			{ language: 'en', gloss: 'forever and ever', words: 4 }
		]
	},
	{
		formulary: 'dominica-xxii-post-pentecosten',
		kind: 'postcommunio',
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
		formulary: 'dominica-xiii-post-pentecosten',
		kind: 'postcommunio',
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
	},
	{
		formulary: 'dominica-vi-post-pentecosten',
		kind: 'collecta',
		response: 'w054',
		conclusion: { section: '115 a', leaf: 22 },
		opening: {
			pl: 'Boże Zastępów, do którego należy wszystko, co najlepsze',
			en: 'God of hosts, all that is best belongs to You.'
		},
		constructions: [
			{ language: 'pl', gloss: 'wzrost pobożności', words: 2 },
			{ language: 'pl', gloss: 'z troskliwą dobrocią', words: 2 },
			{ language: 'en', gloss: 'to whom all that is best belongs', words: 6 },
			{ language: 'en', gloss: 'in our hearts', words: 2 },
			{ language: 'en', gloss: 'an increase of devotion', words: 2 },
			{ language: 'en', gloss: 'You may nourish what is good', words: 4 },
			{ language: 'en', gloss: 'with loving care', words: 2 },
			{ language: 'en', gloss: 'You may guard what has been nourished', words: 4 },
			{ language: 'en', gloss: 'our Lord', words: 2 },
			{ language: 'en', gloss: 'Your Son', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 }
		]
	},
	{
		formulary: 'sancti-laurentii-martyris',
		kind: 'postcommunio',
		response: 'w044',
		conclusion: { section: '115 a', leaf: 22 },
		opening: {
			pl: 'doświadczali wzrostu zbawienia, którego udzielasz.',
			en: 'Filled with the sacred gift, we humbly ask You, Lord'
		},
		constructions: [
			{ language: 'pl', gloss: 'w tym, co sprawujemy z obowiązku należnej służby', words: 5 },
			{ language: 'pl', gloss: 'doświadczyli wzrostu zbawienia, którego udzielasz', words: 4 },
			{ language: 'en', gloss: 'filled with the sacred gift', words: 3 },
			{ language: 'en', gloss: 'we implore You, Lord', words: 3 },
			{ language: 'en', gloss: 'we celebrate in fulfillment of the service we owe', words: 4 },
			{ language: 'en', gloss: 'Your martyr', words: 2 },
			{ language: 'en', gloss: 'we may experience as an increase in Your salvation', words: 4 },
			{ language: 'en', gloss: 'our Lord', words: 2 },
			{ language: 'en', gloss: 'Your Son', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 }
		]
	},
	{
		formulary: 'd-n-iesu-christi-regis',
		kind: 'postcommunio',
		response: 'w036',
		conclusion: { section: '115 c', leaf: 23 },
		opening: {
			pl: 'Dostąpiwszy pożywienia nieśmiertelności, prosimy, Panie',
			en: 'under the banners of Christ the King may forever reign with Him in the heavenly abode.'
		},
		constructions: [
			{
				language: 'pl',
				gloss: 'szczycimy się służbą pod sztandarami Chrystusa Króla',
				words: 6
			},
			{ language: 'pl', gloss: 'mogli królować', words: 2 },
			{ language: 'en', gloss: 'Having received nourishment of immortality', words: 3 },
			{ language: 'en', gloss: 'the banners of Christ the King', words: 3 },
			{ language: 'en', gloss: 'glory in serving', words: 2 },
			{ language: 'en', gloss: 'may reign', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 }
		]
	},
	{
		formulary: 'sancti-lucae-evangelistae',
		kind: 'postcommunio',
		response: 'w046',
		conclusion: { section: '115 a', leaf: 22 },
		opening: {
			pl: 'aby to, co otrzymaliśmy z Twojego świętego ołtarza',
			en: 'Grant, we pray, almighty God, that what we have received from Your holy altar'
		},
		constructions: [
			{ language: 'pl', gloss: 'byśmy przez to mogli być bezpieczni', words: 5 },
			{ language: 'en', gloss: 'we have received from Your holy altar', words: 5 },
			{ language: 'en', gloss: 'of Your blessed evangelist', words: 3 },
			{ language: 'en', gloss: 'our souls', words: 2 },
			{ language: 'en', gloss: 'and through it', words: 2 },
			{ language: 'en', gloss: 'we may be safe', words: 3 },
			{ language: 'en', gloss: 'our Lord', words: 2 },
			{ language: 'en', gloss: 'Your Son', words: 2 },
			{ language: 'en', gloss: 'of the Holy Spirit', words: 2 },
			{ language: 'en', gloss: 'forever and ever', words: 4 }
		]
	}
] as const;

for (const { formulary, kind, response, conclusion, opening, constructions } of prayers) {
	const route = `formularium/${formulary}`;
	const text = `${formulary}-${kind}`;

	for (const { language, gloss, words } of constructions) {
		test(`${language} ${formulary} ${kind} preserves ${gloss}`, async ({ page }) => {
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
				if (
					formulary === 'dominica-vi-post-pentecosten' &&
					['z troskliwą dobrocią', 'with loving care'].includes(gloss)
				) {
					await expect(page.locator('aside')).toContainText('pietatis studio');
					await expect(page.locator('aside')).toContainText(
						language === 'pl' ? 'przez gorliwą pobożność' : 'through zealous devotion to God'
					);
				}
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
		test(`${language} ${formulary} ${kind} preserves its text, response and source`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/${route}`);
			await setHelp(page, 1);
			if (formulary === 'dominica-xxii-post-pentecosten')
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
			await expect(sources).toContainText(new RegExp(`Rubricae generales,? ${conclusion.section}`));
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${conclusion.leaf}/mode/1up"]`
				)
			).toHaveCount(1);
			if (formulary === 'sancti-laurentii-martyris') {
				await expect(sources).toContainText('S. Laurentii Martyris, Postcommunio');
				await expect(
					sources.locator(
						'a[href="https://archive.org/details/missale-romanum-1962/page/n717/mode/1up"]'
					)
				).toHaveCount(1);
				await expect(
					sources.locator(
						'a[href="https://archive.org/details/missale-romanum-1962/page/n715/mode/1up"]'
					)
				).toHaveCount(0);
			}
			if (formulary === 'dominica-vi-post-pentecosten') {
				await expect(sources).toContainText('Dominica VI post Pentecosten, Oratio (continued)');
				await expect(
					sources.locator(
						'a[href="https://archive.org/details/missale-romanum-1962/page/n459/mode/1up"]'
					)
				).toHaveCount(1);
				await expect(
					sources.locator(
						'a[href="https://archive.org/details/missale-romanum-1962/page/n460/mode/1up"]'
					)
				).toHaveCount(1);
			}
			if (formulary === 'dominica-iv-post-epiphaniam') {
				for (const leaf of [125, 126]) {
					await expect(
						sources.locator(
							`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
						)
					).toHaveCount(1);
				}
			}
		});
	}
}

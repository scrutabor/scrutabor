import { expect, setHelp, setTheme, test } from './fixtures';

const text = 'omnium-sanctorum-offertorium';

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/omnium-sanctorum`;
	test(`${language} All Saints offertory retains the complete antiphon and predicates`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(23);
		await expect(section.locator('rt')).toHaveCount(language === 'pl' ? 22 : 21);
		const glosses =
			language === 'pl'
				? [
						['w008', 'nie'],
						['w012', 'niegodziwości'],
						['w017', 'umierać']
					]
				: [
						['w009', 'will not touch'],
						['w017', 'to die'],
						['w019', 'however']
					];
		for (const [word, gloss] of glosses) {
			await expect(section.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await expect(section.locator('.token').last()).toContainText('allelúia');
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveText(
			language === 'pl'
				? 'Dusze sprawiedliwych są w ręku Boga i nie dotknie ich udręka niegodziwości; w oczach nierozumnych zdawali się umierać, oni zaś są w pokoju, alleluja.'
				: 'The souls of the just are in the hand of God, and the torment of malice will not touch them. In the eyes of the foolish they seemed to die, but they are in peace, alleluia.'
		);
	});

	test(`${language} All Saints constructions preserve their words at narrow and wide widths`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const constructions = [
			{
				anchor: 'w013',
				forms: ['visi', 'sunt'],
				gloss: language === 'pl' ? 'wydawali się' : 'they seemed'
			},
			...(language === 'en'
				? [{ anchor: 'w009', forms: ['non', 'tanget'], gloss: 'will not touch' }]
				: [])
		];
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				for (const construction of constructions) {
					const button = page.locator(`button[id="${text}.${construction.anchor}"]`);
					await expect(button.locator('rt')).toHaveText(construction.gloss);
					await expect(button.locator('.token')).toHaveCount(2);
					await button.scrollIntoViewIfNeeded();
					await page.evaluate(() => document.fonts.ready);
					const before = await button.boundingBox();
					await button.hover();
					expect(await button.boundingBox()).toEqual(before);
					await button.focus();
					await button.press('Enter');
					await expect(page.locator('aside .construction-title')).toHaveText(construction.forms);
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
					await page.keyboard.press('Escape');
					await expect(page.locator('aside')).toHaveCount(0);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.emulateMedia({ media: 'print' });
		for (const construction of constructions) {
			await expect(page.locator(`button[id="${text}.${construction.anchor}"] rt`)).toBeVisible();
		}
	});

	test(`${language} All Saints offertory distinguishes the inherited body from its reference`, async ({
		page
	}) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(
			language === 'pl' ? 'Antyfona na ofiarowanie' : 'The offertory antiphon'
		);
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('reference 39 to Commune/C3a-1');
		await expect(sources).toContainText('heading 55, reference 56, body 57');
		await expect(sources).toContainText('seasonal rubric 58 and replacement 59 excluded');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n800/mode/1up"]'
			)
		).toHaveCount(1);
		await expect(sources.locator('a[href$="/web/www/horas/Latin/Commune/C3a-1.txt"]')).toHaveCount(
			1
		);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
	});
}

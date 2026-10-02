import { expect, setHelp, setTheme, test } from './fixtures';

for (const [formulary, text, word, gloss] of [
	[
		'commemoratio-omnium-fidelium-defunctorum',
		'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia',
		'w133',
		'Marię'
	],
	[
		'commemoratio-omnium-fidelium-defunctorum-missa-ii',
		'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia',
		'w133',
		'Marię'
	],
	[
		'commemoratio-omnium-fidelium-defunctorum-missa-iii',
		'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia',
		'w133',
		'Marię'
	],
	['dominica-resurrectionis', 'dominica-resurrectionis-sequentia', 'w027', 'Mario']
] as const) {
	test(`${formulary} distinguishes the sequence's Mary in Polish`, async ({ page }) => {
		await page.goto(`/app/pl/formularium/${formulary}`);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${word}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await button.focus();
		await button.press('Enter');
		await expect(page.locator('aside .morph')).toHaveCount(1);
		await expect(page.locator('aside .gloss')).toHaveText(gloss);
		await page.keyboard.press('Escape');
		await expect(page.locator('aside')).toHaveCount(0);
		if (formulary === 'dominica-resurrectionis') {
			await setHelp(page, 2);
			await expect(page.locator(`#text-proprium-${text} .translation`)).toContainText(
				'Powiedz nam, Maryjo, coś widziała w drodze?'
			);
		}
	});
}

const purification = 'purificatio-beatae-mariae-virginis-postcommunio';
const prose =
	'We ask You, Lord our God: through the intercession of blessed Mary, ever Virgin, make the most holy mysteries, which You have bestowed to safeguard our restoration, a remedy for us both now and in the future. Through our Lord Jesus Christ, Your Son, who lives and reigns with You in the unity of the Holy Spirit, God, forever and ever.';

test('Purification preserves the complete English petition and separate response', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.goto('/app/en/formularium/purificatio-beatae-mariae-virginis');
	const section = page.locator(`#text-proprium-${purification}`);
	await setHelp(page, 2);
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			await expect(section.locator('.translation')).toHaveText([prose, 'Amen.']);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	}
	await setHelp(page, 1);
	await expect(section.locator('.token')).toHaveCount(48);
	await expect(section.locator(`button[id="${purification}.w016"] rt`)).toHaveText('Mary');
	await expect(section.locator(`button[id="${purification}.w048"] rt`)).toHaveText('Amen');
	await setHelp(page, 2);
	await page.emulateMedia({ media: 'print' });
	await expect(section.locator('.translation')).toHaveText([prose, 'Amen.']);
});

for (const language of ['pl', 'en'] as const) {
	test(`${language} Purification identifies the body and expanded conclusion separately`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/purificatio-beatae-mariae-virginis`);
		await page
			.locator(`#text-proprium-${purification}`)
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('expanded conclusion w027–w047 and textual Amen w048');
		await expect(sources).toContainText('heading 206, body 207 and $Per Dominum at line 208');
		await expect(sources).toContainText('heading 95, conclusion 96, response 97');
		for (const leaf of ['n549', 'n22']) {
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
		await expect(
			sources
				.locator('li')
				.filter({ hasText: 'heading 95, conclusion 96, response 97' })
				.locator('a')
		).toHaveAttribute(
			'href',
			'https://github.com/DivinumOfficium/divinum-officium/commit/44667ff518b8ff1439780470828b39714f5306a2'
		);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				for (const region of [sources, dialog.locator('.inner')]) {
					expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
				}
			}
		}
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
	});
}

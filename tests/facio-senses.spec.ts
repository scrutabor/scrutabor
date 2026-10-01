import { expect, setTheme, test } from './fixtures';

const contexts = [
	[
		'formularium/purificatio-beatae-mariae-virginis',
		'purificatio-beatae-mariae-virginis-postcommunio.w024',
		'facio'
	],
	['ordinarium/credo', 'w044', 'facio'],
	['ordinarium/credo', 'w074', 'facio'],
	[
		'formularium/dominica-ii-post-pentecosten',
		'dominica-ii-post-pentecosten-alleluia.w011',
		'facio'
	],
	['formularium/sancti-andreae-apostoli', 'sancti-andreae-apostoli-communio.w006', 'fio'],
	['formularium/dominica-in-sexagesima', 'dominica-in-sexagesima-epistola.w103', 'facio']
] as const;

for (const language of ['pl', 'en'] as const) {
	const qualified =
		language === 'pl' ? 'stać się (w stronie biernej)' : 'to become, come to pass (in the passive)';
	const passive = language === 'pl' ? 'być czynionym' : 'to be done, be made';

	test(`${language} facio and fio retain distinct dictionary entries`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		for (const [lemma, head, sense] of [
			['facio', 'fácio, fácere, feci, factum', qualified],
			['fio', 'fio, fíeri, factus sum', passive]
		]) {
			await page.goto(`/app/${language}/lemma?l=${lemma}`);
			const entry = page.locator('.lexical-summary');
			await expect(entry.locator('.head')).toContainText(head);
			await expect(entry.locator('.head-senses')).toContainText(sense);
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
	});

	for (const [path, word, lemma] of contexts) {
		test(`${language} ${path} ${word} keeps its source lemma accessible`, async ({ page }) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/${path}?w=${word}`);
			const dialog = page.getByRole('dialog');
			const head = dialog.locator('.head').filter({
				has: page.locator(`a[href$="/lemma?l=${lemma}"]`)
			});
			await expect(head).toHaveCount(1);
			await expect(head.locator('.head-senses')).toContainText(
				lemma === 'facio' ? qualified : passive
			);
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				await head.scrollIntoViewIfNeeded();
				await expect(head).toBeVisible();
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
			await head.locator('a').click();
			await expect(page.locator('.lexical-summary .head-senses')).toContainText(
				lemma === 'facio' ? qualified : passive
			);
		});
	}
}

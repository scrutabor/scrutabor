import { expect, setTheme, test } from './fixtures';

const cards = [
	{
		lemma: 'instauro',
		part: 'postcommunio',
		word: 'w012',
		pl: { senses: '— odnawiać, przywracać, streszczać się (w stronie biernej)' },
		en: { senses: '— to restore, renew, to sum up' }
	},
	{
		lemma: 'impero',
		part: 'evangelium',
		word: 'w054',
		pl: { note: 'Celownik może wskazywać, komu lub czemu wydaje się rozkaz.' },
		en: { note: 'The dative can indicate the person or thing being commanded.' }
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of cards) {
		test(`${language} ${item.lemma} preserves its qualified dictionary meaning`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				const day = 'dominica-iv-post-epiphaniam';
				await page.goto(`/app/${language}/formularium/${day}?w=${day}-${item.part}.${item.word}`);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				const dialog = page.getByRole('dialog');
				const head = dialog.locator('.head').filter({
					has: page.locator(`a[href$="/lemma?l=${item.lemma}"]`)
				});
				await expect(head).toHaveCount(1);
				const wording = item[language];
				if ('senses' in wording) {
					await expect(head.locator('.head-senses')).toHaveText(wording.senses);
				} else {
					await expect(dialog.locator('.layers .note')).toHaveText(wording.note);
				}
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await head.locator('a').click();
				const entry = page.locator('.lexical-summary');
				if ('senses' in wording) {
					await expect(entry.locator('.head-senses')).toHaveText(wording.senses);
				} else {
					await expect(entry.locator('.note')).toHaveText(wording.note);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		});
	}

	for (const item of [
		{
			day: 'dominica-i-post-epiphaniam',
			part: 'communio',
			word: 'w014',
			pl: 'mianownik',
			en: 'nominative'
		},
		{
			day: 'dominica-resurrectionis',
			part: 'sequentia',
			word: 'w028',
			pl: 'biernik',
			en: 'accusative'
		}
	] as const) {
		test(`${language} ${item.day} ${item.word} shows neuter without changing its case`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(
					`/app/${language}/formularium/${item.day}?w=${item.day}-${item.part}.${item.word}`
				);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				const dialog = page.getByRole('dialog');
				await expect(dialog.locator('.form')).toHaveText('quid');
				await expect(dialog.locator('.morph')).toContainText(item[language]);
				await expect(dialog.locator('.morph')).toContainText(
					language === 'pl' ? 'r.\u00a0nijaki' : 'neuter'
				);
				await expect(dialog.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}

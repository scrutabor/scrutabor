import { expect, setTheme, test } from './fixtures';

const observations = [
	{
		day: 'dominica-in-sexagesima',
		part: 'epistola',
		word: 'w201',
		form: 'méntior',
		lemma: 'mentior',
		pl: ['koniugacja\u00a0IV', 'deponens', 'czas teraźniejszy'],
		en: ['4th\u00a0conjugation', 'deponent', 'present']
	},
	{
		day: 'dominica-iii-post-pascha',
		part: 'introitus',
		word: 'w030',
		form: 'mentiéntur',
		lemma: 'mentior',
		pl: ['koniugacja\u00a0IV', 'deponens', 'czas przyszły'],
		en: ['4th\u00a0conjugation', 'deponent', 'future']
	},
	{
		day: 'omnium-sanctorum',
		part: 'evangelium',
		word: 'w099',
		form: 'mentiéntes',
		lemma: 'mentior',
		pl: ['koniugacja\u00a0IV', 'deponens', 'imiesłów', 'czas teraźniejszy'],
		en: ['4th\u00a0conjugation', 'deponent', 'participle', 'present']
	},
	{
		day: 'dominica-in-sexagesima',
		part: 'epistola',
		word: 'w202',
		form: 'Damásci',
		lemma: 'Damascus',
		pl: ['miejscownik', 'r.\u00a0żeński', 'l.\u00a0poj.'],
		en: ['locative', 'feminine', 'singular']
	},
	{
		day: 'dominica-in-sexagesima',
		part: 'evangelium',
		word: 'w146',
		form: 'audíerint',
		lemma: 'audio',
		pl: ['futurum exactum', 'tryb oznajmujący'],
		en: ['future perfect', 'indicative']
	},
	{
		day: 'dominica-in-sexagesima',
		part: 'evangelium',
		word: 'w206',
		form: 'áfferunt',
		lemma: 'affero',
		pl: ['czas teraźniejszy', 'tryb oznajmujący', '3.\u00a0os.', 'l.\u00a0mn.'],
		en: ['present', 'indicative', '3rd\u00a0person', 'plural']
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of observations) {
		test(`${language} ${item.day} ${item.word} preserves the contextual analysis @reader`, async ({
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
				const member = dialog.locator(`[aria-labelledby="construction-${item.word}-title"]`);
				const grouped = (await member.count()) !== 0;
				const card = grouped ? member : dialog;
				await expect(card.locator(grouped ? '.construction-title' : '.form')).toHaveText(item.form);
				await expect(card.locator('.head a')).toHaveAttribute(
					'href',
					`/app/${language}/lemma?l=${item.lemma}`
				);
				for (const feature of item[language]) {
					await expect(card.locator('.morph')).toContainText(feature);
				}
				if (item.word === 'w146') {
					await expect(card.locator('.verification')).toContainText(
						language === 'pl' ? 'średnia' : 'medium'
					);
					await expect(card.locator('.verification')).toContainText(
						language === 'pl' ? 'do przeglądu' : 'awaiting review'
					);
					// The displayed choice must retain the genuinely competing reading.
					await expect(card.locator('.explanation')).toContainText(
						language === 'pl' ? 'łączącego' : 'subjunctive'
					);
				}
				if (item.word === 'w202') {
					await expect(card.locator('.verification')).not.toContainText('Whitaker');
					await expect(card.locator('.verification')).not.toContainText('Collatinus');
				}
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}

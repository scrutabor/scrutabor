import { expect, setTheme, test } from './fixtures';

const day = 'dominica-in-quinquagesima';
const observations = [
	{
		part: 'epistola',
		word: 'w005',
		form: 'loquar',
		lemma: 'loquor',
		medium: true,
		pl: ['czas teraźniejszy', 'tryb łączący', 'deponens'],
		en: ['present', 'subjunctive', 'deponent'],
		notePl: 'oznajmującego',
		noteEn: 'future indicative'
	},
	{
		part: 'epistola',
		word: 'w022',
		form: 'habúero',
		lemma: 'habeo',
		medium: false,
		pl: ['futurum exactum', 'tryb oznajmujący', '1.\u00a0os.'],
		en: ['future perfect', 'indicative', '1st\u00a0person'],
		notePl: 'Noverim',
		noteEn: 'Noverim'
	},
	{
		part: 'epistola',
		word: 'w133',
		form: 'vénerit',
		lemma: 'venio',
		medium: true,
		pl: ['futurum exactum', 'tryb oznajmujący'],
		en: ['future perfect', 'indicative'],
		notePl: 'łączącym',
		noteEn: 'perfect subjunctive'
	},
	{
		part: 'epistola',
		word: 'w025',
		form: 'nóverim',
		lemma: 'nosco',
		medium: false,
		pl: ['perfectum', 'tryb łączący', '1.\u00a0os.'],
		en: ['perfect', 'subjunctive', '1st\u00a0person']
	},
	{
		part: 'epistola',
		word: 'w195',
		form: 'horum',
		lemma: 'hic',
		medium: false,
		pl: ['dopełniacz', 'r.\u00a0nijaki', 'l.\u00a0mn.'],
		en: ['genitive', 'neuter', 'plural']
	},
	{
		part: 'tractus',
		word: 'w027',
		form: 'nos',
		lemma: 'nos',
		medium: true,
		pl: ['biernik', 'l.\u00a0mn.'],
		en: ['accusative', 'plural'],
		notePl: 'mianownik',
		noteEn: 'nominative'
	},
	{
		part: 'evangelium',
		word: 'w035',
		form: 'flagelláverint',
		lemma: 'flagello',
		medium: true,
		pl: ['futurum exactum', 'tryb oznajmujący'],
		en: ['future perfect', 'indicative'],
		notePl: 'łączącym',
		noteEn: 'perfect subjunctive'
	},
	{
		part: 'evangelium',
		word: 'w045',
		form: 'horum',
		lemma: 'hic',
		medium: false,
		pl: ['dopełniacz', 'r.\u00a0nijaki', 'l.\u00a0mn.'],
		en: ['genitive', 'neuter', 'plural']
	},
	{
		part: 'evangelium',
		word: 'w050',
		form: 'istud',
		lemma: 'iste',
		medium: false,
		pl: ['mianownik', 'r.\u00a0nijaki', 'l.\u00a0poj.'],
		en: ['nominative', 'neuter', 'singular']
	},
	{
		part: 'evangelium',
		word: 'w053',
		form: 'eis',
		lemma: 'is',
		medium: false,
		pl: ['ablativus', 'r.\u00a0męski', 'l.\u00a0mn.'],
		en: ['ablative', 'masculine', 'plural']
	},
	{
		part: 'evangelium',
		word: 'w066',
		form: 'quidam',
		lemma: 'quidam',
		medium: false,
		pl: ['mianownik', 'r.\u00a0męski', 'l.\u00a0poj.'],
		en: ['nominative', 'masculine', 'singular']
	},
	{
		part: 'communio',
		word: 'w010',
		form: 'eis',
		lemma: 'is',
		medium: false,
		pl: ['celownik', 'r.\u00a0męski', 'l.\u00a0mn.'],
		en: ['dative', 'masculine', 'plural']
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of observations) {
		test(`${language} Quinquagesima ${item.part} ${item.word} retains its contextual analysis @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}?w=${day}-${item.part}.${item.word}`);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				const dialog = page.getByRole('dialog');
				const member = dialog.locator(`[aria-labelledby="construction-${item.word}-title"]`);
				const grouped = (await member.count()) !== 0;
				const card = grouped ? member : dialog;
				await expect(card.locator(grouped ? '.construction-title' : '.form')).toHaveText(item.form);
				await expect(card.locator('.head a')).toHaveAttribute(
					'href',
					`/app/${language}/lemma?l=${item.lemma}`
				);
				for (const feature of item[language])
					await expect(card.locator('.morph')).toContainText(feature);
				if (item.medium)
					await expect(card.locator('.verification')).toContainText(
						language === 'pl' ? 'średnia' : 'medium'
					);
				if (item.word !== 'w022' && item.word !== 'w025')
					await expect(card.locator('.verification')).toContainText(
						language === 'pl' ? 'do przeglądu' : 'awaiting review'
					);
				if ('notePl' in item)
					await expect(card.locator('.explanation')).toContainText(
						language === 'pl' ? item.notePl : item.noteEn
					);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}

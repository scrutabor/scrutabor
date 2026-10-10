import { expect, setTheme, test } from './fixtures';

const readings = [
	{
		day: 'dominica-ii-in-quadragesima',
		text: 'dominica-ii-in-quadragesima-introitus',
		word: 'w008',
		form: 'quæ',
		pl: 'zaimek — mianownik, l.\u00a0mn., r.\u00a0żeński',
		en: 'pronoun — nominative, plural, feminine',
		confidence: 'high'
	},
	{
		day: 'ascensio-domini',
		text: 'ascensio-domini-epistola',
		word: 'w009',
		form: 'quæ',
		pl: 'zaimek — biernik, l.\u00a0mn., r.\u00a0nijaki',
		en: 'pronoun — accusative, plural, neuter',
		confidence: 'high'
	},
	{
		day: 'dominica-iv-in-quadragesima',
		text: 'dominica-iv-in-quadragesima-epistola',
		word: 'w035',
		form: 'Hæc',
		// The context does not settle the gender: the reader must not invent one.
		pl: 'zaimek — mianownik, l.\u00a0mn.',
		en: 'pronoun — nominative, plural',
		confidence: 'medium'
	},
	...['dominica-v-post-epiphaniam', 'dominica-v-quae-superfuit-post-epiphaniam'].map((day) => ({
		day,
		text: 'dominica-v-post-epiphaniam-postcommunio',
		word: 'w009',
		form: 'cuius',
		pl: 'zaimek — dopełniacz, l.\u00a0poj., r.\u00a0nijaki',
		en: 'pronoun — genitive, singular, neuter',
		confidence: 'medium'
	}))
];

for (const language of ['pl', 'en'] as const) {
	for (const item of readings) {
		test(`${language} ${item.day} ${item.word} keeps contextual pronoun features @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${item.day}?w=${item.text}.${item.word}`);
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
					`/app/${language}/lemma?l=${item.form === 'Hæc' ? 'hic' : 'qui'}`
				);
				await expect(card.locator('.morph')).toHaveText(item[language]);
				const confidence =
					language === 'pl'
						? item.confidence === 'medium'
							? 'średnia'
							: 'wysoka'
						: item.confidence;
				await expect(card.locator('.verification')).toContainText(confidence);
				await expect(card.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}

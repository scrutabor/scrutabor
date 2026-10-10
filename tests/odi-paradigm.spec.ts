import { expect, setTheme, test } from './fixtures';

const notes = {
	pl: 'Czasownik ułomny. Formy perfectum często wyrażają stan teraźniejszy, np. odi: „nienawidzę”. W późniejszej łacinie występują też formy czasu teraźniejszego, w tym imiesłów odientes. Znaczenie czasowe konkretnej formy wynika z jej kontekstu.',
	en: 'A defective verb. Perfect forms often express a present state, as in odi, “I hate”. Later Latin also has present forms, including the participle odientes. The time reference of a particular form depends on its context.'
} as const;

const cases = [
	{
		day: 'dominica-ii-post-epiphaniam',
		text: 'dominica-ii-post-epiphaniam-epistola',
		word: 'w044',
		form: 'Odiéntes',
		pl: { gloss: 'Nienawidzący', morph: 'imiesłów, czas teraźniejszy' },
		en: { gloss: 'Hate', morph: 'participle, present' }
	},
	{
		day: 'nativitas-domini-in-die',
		text: 'nativitas-domini-in-die-epistola',
		word: 'w133',
		form: 'odísti',
		pl: { gloss: 'znienawidziłeś', morph: 'perfectum' },
		en: { gloss: 'have hated', morph: 'perfect' }
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of cases) {
		test(`${language} ${item.form} preserves context without an ordinary conjugation`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${item.day}`);
				await setTheme(page, theme);
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				await page.locator(`button[id="${item.text}.${item.word}"]`).click();
				const panel = page.getByRole('dialog');
				await expect(panel.locator('.form')).toHaveText(item.form);
				await expect(panel.locator('.context-layer > .gloss')).toHaveText(item[language].gloss);
				await expect(panel.locator('.morph')).toContainText(item[language].morph);
				await expect(panel.locator('.morph')).not.toContainText(/koniugacja|conjugation/);
				await expect(panel.locator('.layers .note')).toHaveText(notes[language]);
				await expect(panel.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				expect(
					await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await panel.locator('.head > a').click();
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				await expect(page.locator('.lexical-summary .head')).toContainText('odi, odísse, osus sum');
				await expect(page.locator('.lexical-summary .note')).toHaveText(notes[language]);
				await expect(page.locator('.lexical-summary .grammar')).not.toContainText(
					/koniugacja|conjugation/
				);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		});
	}
}

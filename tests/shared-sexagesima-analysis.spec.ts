import { expect, setTheme, test } from './fixtures';

const text = 'dominica-i-post-epiphaniam-postcommunio';
const parents = [
	'dominica-i-post-epiphaniam',
	'dominica-in-sexagesima',
	'dominica-ii-in-quadragesima'
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const parent of parents) {
		test(`${language} ${parent} retains the shared quos analysis @reader`, async ({ page }) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${parent}?w=${text}.w007`);
				await setTheme(page, theme);
				const dialog = page.getByRole('dialog');
				const card =
					language === 'en'
						? dialog.locator('[aria-labelledby="construction-w007-title"]')
						: dialog;
				await expect(card.locator(language === 'en' ? '.construction-title' : '.form')).toHaveText(
					'quos'
				);
				await expect(card.locator('.head a')).toHaveAttribute(
					'href',
					`/app/${language}/lemma?l=qui`
				);
				const features =
					language === 'pl'
						? ['biernik', 'l.\u00a0mn.', 'r.\u00a0męski']
						: ['accusative', 'plural', 'masculine'];
				for (const feature of features) await expect(card.locator('.morph')).toContainText(feature);
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

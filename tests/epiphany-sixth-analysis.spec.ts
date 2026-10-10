import { expect, setTheme, test } from './fixtures';

const day = 'dominica-vi-post-epiphaniam';

for (const language of ['pl', 'en'] as const) {
	for (const item of [
		{ part: 'collecta', word: 'w009', pl: 'mianownik', en: 'nominative' },
		{ part: 'postcommunio', word: 'w010', pl: 'biernik', en: 'accusative' }
	] as const) {
		test(`${language} sixth Epiphany ${item.part} keeps the contextual neuter case @reader`, async ({
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
				const dialog = page.getByRole('dialog');
				const member = dialog.locator(`[aria-labelledby="construction-${item.word}-title"]`);
				const card = (await member.count()) ? member : dialog;
				await expect(card.locator('.morph')).toContainText(item[language]);
				await expect(card.locator('.morph')).toContainText(
					language === 'pl' ? 'l.\u00a0mn.' : 'plural'
				);
				await expect(card.locator('.morph')).toContainText(
					language === 'pl' ? 'r.\u00a0nijaki' : 'neuter'
				);
				await expect(card.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}

	test(`${language} sixth Epiphany creverit retains its qualified future-perfect reading @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/app/${language}/formularium/${day}?w=${day}-evangelium.w030`);
			await setTheme(page, theme);
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.form')).toHaveText('créverit');
			await expect(dialog.locator('.morph')).toContainText(
				language === 'pl' ? 'futurum exactum' : 'future perfect'
			);
			await expect(dialog.locator('.morph')).toContainText(
				language === 'pl' ? 'tryb oznajmujący' : 'indicative'
			);
			await expect(dialog.locator('.verification')).toContainText(
				language === 'pl' ? 'średnia' : 'medium'
			);
			await expect(dialog.locator('.verification')).toContainText(
				language === 'pl' ? 'do przeglądu' : 'awaiting review'
			);
			await expect(dialog.locator('.explanation')).toHaveText(
				language === 'pl'
					? 'Futurum exactum ujmuje wzrost jako dokonany przed późniejszym stanem. Créverit ma jednak tę samą postać także w perfectum trybu łączącego, dlatego wybór trybu w tym zdaniu z cum pozostaje niepewny.'
					: 'The future perfect presents growth as complete before the later state. Créverit is also the form of the perfect subjunctive, so the contextual mood choice in this cum clause remains uncertain.'
			);
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
		}
	});
}

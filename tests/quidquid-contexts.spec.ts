import { expect, setTheme, test } from './fixtures';

const cases = [
	{
		day: 'dominica-xxiii-post-pentecosten',
		text: 'dominica-xxiii-post-pentecosten-communio',
		word: 'w004',
		form: 'quidquid',
		casePl: 'biernik',
		caseEn: 'accusative',
		pending: true
	},
	{
		day: 'dominica-xxiv-post-pentecosten',
		text: 'dominica-xxiv-post-pentecosten-postcommunio',
		word: 'w011',
		form: 'quidquid',
		casePl: 'mianownik',
		caseEn: 'nominative',
		pending: true
	},
	{
		day: 'commemoratio-omnium-fidelium-defunctorum',
		text: 'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia',
		word: 'w058',
		form: 'Quidquid',
		casePl: 'mianownik',
		caseEn: 'nominative',
		pending: false
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of cases) {
		test(`${language} ${item.text} keeps the contextual case and neuter of quidquid`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/formularium/${item.day}?w=${item.text}.${item.word}`);
			const panel = page.getByRole('dialog');
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				await expect(panel.locator('.form')).toHaveText(item.form);
				await expect(panel.locator('.head > a')).toHaveAttribute(
					'href',
					`/app/${language}/lemma?l=quisquis`
				);
				await expect(panel.locator('.morph')).toHaveText(
					language === 'pl'
						? `zaimek — ${item.casePl}, l. poj., r. nijaki`
						: `pronoun — ${item.caseEn}, singular, neuter`
				);
				if (item.pending) {
					await expect(panel.locator('.verification')).toContainText(
						language === 'pl' ? 'do przeglądu' : 'awaiting review'
					);
				}
				expect(
					await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}

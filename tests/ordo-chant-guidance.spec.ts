import { expect, test } from './fixtures';

const notes = {
	pl: 'Traktus i sekwencja pojawiają się zgodnie z rubrykami formularza.',
	en: 'The Tract and the Sequence are included where prescribed.'
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} chant guidance defers to the formulary without removing the Sunday Tract @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-02-01`);
		const gradual = page.locator('[id="dominica-in-septuagesima-graduale.w001"]');
		const tract = page.locator('[id="dominica-in-septuagesima-tractus.w001"]');
		await expect(gradual).toBeVisible();
		await expect(tract).toBeVisible();
		const chant = page.locator('section.part').filter({ has: gradual });
		await expect(chant.locator('.when')).toHaveText(notes[language]);
		await expect(chant.locator('[id*="-alleluia.w"]')).toHaveCount(0);
	});
}

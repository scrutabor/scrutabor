import { expect, test } from './fixtures';

const notes = {
	pl: 'traktus śpiewa się tylko wtedy, gdy przewiduje go formularz dnia. Podobnie sekwencję dodaje się zgodnie z jego rubrykami',
	en: "the Tract is sung only when prescribed by the day's formulary. The Sequence is likewise included according to its rubrics"
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

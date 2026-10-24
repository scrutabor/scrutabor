import { expect, setHelp, test } from './fixtures';

for (const lang of ['pl', 'en'] as const) {
	test(`@reader ${lang} Gloria omission removes words and recovers with a required Mass`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		await expect(page.locator('[id="dominica-iii-post-pascha-collecta.w001"]')).toBeVisible();
		await setHelp(page, 0);
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="credo.w001"]')).toHaveCount(1);
		await expect(page.locator('section.part.omitted')).toHaveCount(0);

		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-11-29`);
		await expect(page.locator('[id="dominica-i-adventus-collecta.w001"]')).toBeVisible();
		const omitted = page.locator('section.part.omitted');
		await expect(omitted).toHaveCount(1);
		await expect(omitted.locator('.part-title')).toHaveText('Glória in excélsis');
		await expect(omitted.locator('.part-note')).toHaveText(
			lang === 'pl'
				? 'W tej Mszy nie odmawia się hymnu Gloria.'
				: 'The Gloria is omitted at this Mass.'
		);
		await expect(omitted.locator('.word, .part-text, button.unfold')).toHaveCount(0);
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(0);
		await expect(page.locator('[id="credo.w001"]')).toHaveCount(1);

		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		await expect(page.locator('[id="dominica-iii-post-pascha-collecta.w001"]')).toBeVisible();
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
		await expect(page.locator('section.part.omitted')).toHaveCount(0);
	});

	test(`@reader ${lang} explicit Ordinary alone restores the omitted Creed`, async ({ page }) => {
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-02`);
		await expect(page.locator('[id="feria-v-in-cena-domini-collecta.w001"]')).toBeVisible();
		await setHelp(page, 0);
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="credo.w001"]')).toHaveCount(0);
		await expect(page.locator('section.part.omitted .part-note')).toHaveText(
			lang === 'pl' ? 'W tej Mszy nie odmawia się Credo.' : 'The Creed is omitted at this Mass.'
		);

		await page.locator('.picker.day .day-open').click();
		const picker = page.getByRole('dialog', { name: /Wybór dnia|Choose a day/ });
		await expect(picker.locator('.date-cell[aria-pressed="true"]')).toHaveAttribute(
			'data-date',
			'2026-04-02'
		);
		await picker.locator('.confirm-actions .secondary').click();
		await expect(picker).toHaveCount(0);
		await expect(page).toHaveURL(/dies=2026-04-02&missa=none/);
		await expect(page.locator('.choice-date')).toHaveText(
			lang === 'pl' ? '2 kwietnia 2026' : '2 April 2026'
		);
		await expect(page.locator('[id="feria-v-in-cena-domini-collecta.w001"]')).toHaveCount(0);
		await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('.day-open')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="credo.w001"]')).toHaveCount(1);
		await expect(page.locator('section.part.omitted')).toHaveCount(0);

		await page.locator('.picker.day .day-open').click();
		await expect(picker.locator('.date-cell[aria-pressed="true"]')).toHaveAttribute(
			'data-date',
			'2026-04-02'
		);
		await picker.locator('.modal-actions .primary').click();
		await expect(picker).toHaveCount(0);
		await expect(page).toHaveURL(/dies=2026-04-02$/);
		await expect(page.locator('.choice-date')).toHaveText(
			lang === 'pl' ? '2 kwietnia 2026' : '2 April 2026'
		);
		await expect(page.locator('[id="feria-v-in-cena-domini-collecta.w001"]')).toBeVisible();
		await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="credo.w001"]')).toHaveCount(0);
		await expect(page.locator('section.part.omitted .part-note')).toHaveText(
			lang === 'pl' ? 'W tej Mszy nie odmawia się Credo.' : 'The Creed is omitted at this Mass.'
		);
		await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('.picker.day .state')).toHaveCount(0);
	});
}

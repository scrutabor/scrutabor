import { expect, test } from './fixtures';

for (const language of ['pl', 'en']) {
	for (const word of ['w052', 'w053']) {
		for (const motion of ['reduce', 'no-preference'] as const) {
			test(`${language} deep-linked ${word} (${motion}) keeps the entire construction above its panel`, async ({
				page
			}) => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.emulateMedia({ reducedMotion: motion });
				await page.addInitScript(() => {
					localStorage.setItem('scrutabor-reading', 'largest');
					localStorage.setItem('scrutabor-help', '1');
				});
				await page.goto(`/app/${language}/ordinarium/praefatio-communis?w=${word}`);
				const panel = page.getByRole('dialog');
				await expect(panel.locator('.construction-card')).toHaveCount(9);
				const group = page.locator('.token-group').filter({ has: page.locator('button.selected') });
				await expect(group).toHaveCount(1);
				// Do not scroll in the test: arrival itself must expose the selected
				// construction's Latin AND its shared target, including non-anchor links.
				await expect
					.poll(async () => {
						const gloss = await group.locator('rt').boundingBox();
						const sheet = await panel.boundingBox();
						return gloss && sheet ? sheet.y - gloss.y - gloss.height : -1;
					})
					.toBeGreaterThanOrEqual(8);
				const latin = await group.locator('.shared-base').boundingBox();
				expect(latin?.y).toBeGreaterThanOrEqual(0);
			});
		}
	}
}

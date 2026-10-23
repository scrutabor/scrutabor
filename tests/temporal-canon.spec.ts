import { expect, setHelp, test } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

const texts = [
	{ slug: 'communicantes-in-ascensione-domini', verses: 9, words: 101, pl: 72, en: 68 },
	{ slug: 'communicantes-in-die-paschae', verses: 10, words: 92, pl: 71, en: 69 },
	{ slug: 'communicantes-in-epiphania-domini', verses: 9, words: 100, pl: 73, en: 69 },
	{ slug: 'communicantes-in-nativitate-domini-in-die', verses: 10, words: 95, pl: 76, en: 71 },
	{ slug: 'communicantes-in-nativitate-domini-in-nocte', verses: 10, words: 95, pl: 76, en: 71 },
	{ slug: 'communicantes-in-nocte-paschae', verses: 10, words: 92, pl: 71, en: 69 },
	{ slug: 'communicantes-in-pentecoste', verses: 9, words: 92, pl: 70, en: 66 },
	// Its s03 and s04 are now retired into s02: one verse for the whole first sentence, the same
	// 59 words, and captions recounted from the delivered groups.
	{ slug: 'hanc-igitur-paschale', verses: 3, words: 59, pl: 43, en: 35 }
];

test('@reader the paschal Hanc igitur keeps its first sentence in one verse', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/hanc-igitur-paschale');
	await expect(page.locator('main .verse[id="s02"] .base')).toHaveCount(35);
	await expect(page.locator('main [id="s03"], main [id="s04"]')).toHaveCount(0);
});

for (const language of ['pl', 'en'] as const) {
	for (const item of texts) {
		test(`@reader ${language}: ${item.slug} complete narrow Canon`, async ({ page }) => {
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/${item.slug}`);
			await setHelp(page, 1);
			await page.evaluate(() => document.fonts.ready);
			await expect(page.locator('main .verse[id]')).toHaveCount(item.verses);
			await expect(page.locator('main .verse .base')).toHaveCount(item.words);
			await expect(page.locator('main .verse rt .caption-content')).toHaveCount(item[language]);
			const boxes = await page.locator('main').evaluate(interlinearGeometry);
			expect(boxes.length).toBeGreaterThan(15);
			for (const box of boxes) {
				expect(box.sourceClipping, JSON.stringify(box)).toEqual([]);
				expect(box.captionClipping, JSON.stringify(box)).toEqual([]);
				expect(box.clearance, JSON.stringify(box)).toBeGreaterThanOrEqual(0);
			}
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			await page.emulateMedia({ media: 'print' });
			await expect(page.locator('main .verse[id]')).toHaveCount(item.verses);
			await expect(page.locator('main .verse rt').first()).toBeVisible();
		});
	}
}

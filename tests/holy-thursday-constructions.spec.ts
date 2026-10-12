import { expect, setHelp, test } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

for (const language of ['pl', 'en']) {
	for (const formulary of [
		'feria-v-in-cena-domini',
		'exaltatio-sanctae-crucis',
		'dominica-iii-post-epiphaniam',
		'dominica-iv-post-epiphaniam',
		'dominica-v-post-epiphaniam',
		'dominica-vi-post-epiphaniam'
	]) {
		test(`@reader ${language}: complete ${formulary} captions fit a narrow screen`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/formularium/${formulary}`);
			await setHelp(page, 1);
			await page.evaluate(() => document.fonts.ready);
			const measurements = await page.locator('main').evaluate(interlinearGeometry);
			expect(measurements.length).toBeGreaterThan(100);
			for (const box of measurements) {
				expect(box.sourceClipping, JSON.stringify(box)).toEqual([]);
				expect(box.captionClipping, JSON.stringify(box)).toEqual([]);
				expect(box.clearance, JSON.stringify(box)).toBeGreaterThanOrEqual(0);
			}
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		});
	}
}

for (const language of ['pl', 'en']) {
	for (const member of ['w030', 'w031']) {
		test(`@reader ${language}: Holy Thursday supper construction at ${member}`, async ({
			page
		}) => {
			const slug = 'feria-v-in-cena-domini-evangelium';
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-04-02&w=${slug}.${member}`);
			const panel = page.locator('aside.panel[role="dialog"]');
			await expect(panel.locator('.form')).toHaveText(/cena facta/i);
			await expect(panel.locator('.construction-title')).toHaveText(['cena', 'facta']);
			const caption = language === 'pl' ? 'podczas wieczerzy' : 'during supper';
			await expect(panel.locator('.context-layer > .gloss')).toHaveText(caption);
			const participle = panel.locator('.construction-card').filter({
				has: page.locator('.construction-title').filter({ hasText: /^facta$/ })
			});
			await expect(participle.locator('.morph')).toContainText(
				language === 'pl' ? 'imiesłów' : 'participle'
			);
			await expect(participle.locator('.morph')).toContainText(
				language === 'pl' ? 'perfectum' : 'perfect'
			);
			await expect(participle.locator('.morph')).toContainText(
				language === 'pl' ? 'bierna' : 'passive'
			);
			await expect(participle).toContainText(
				language === 'pl' ? 'przygotowania i podania posiłku' : 'prepared and served'
			);
			await expect(participle).toContainText(language === 'pl' ? 'po wieczerzy' : 'after supper');
			await expect(participle).toContainText('postquam cenavit');
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			await page.keyboard.press('Escape');
			await expect(panel).toHaveCount(0);
			await setHelp(page, 1);
			const button = page.locator(`button[id="${slug}.w030"]`);
			await expect(button.locator('rt')).toHaveText(caption);
			await page.evaluate(() => document.fonts.ready);
			const group = page.locator('.token-group').filter({ has: button });
			const boxes = await group.evaluate(interlinearGeometry);
			expect(boxes).toHaveLength(1);
			expect(boxes[0].sourceClipping).toEqual([]);
			expect(boxes[0].captionClipping).toEqual([]);
			expect(boxes[0].clearance).toBeGreaterThanOrEqual(0);
		});
	}
}

for (const [slug, word, caption] of [
	['feria-v-in-cena-domini-epistola', 'w084', 'Moje'],
	['feria-v-in-cena-domini-evangelium', 'w110', 'Ja'],
	['feria-v-in-cena-domini-communio', 'w018', 'Ja']
]) {
	test(`@reader Holy Thursday divine direct speech: ${slug}`, async ({ page }) => {
		await page.goto(`/app/pl/formularium/feria-v-in-cena-domini?w=${slug}.${word}`);
		const panel = page.locator('aside.panel[role="dialog"]');
		await expect(panel.locator('.context-layer > .gloss')).toHaveText(caption);
		await page.keyboard.press('Escape');
		await setHelp(page, 1);
		await expect(page.locator(`button[id="${slug}.${word}"] rt`)).toHaveText(caption);
	});
}

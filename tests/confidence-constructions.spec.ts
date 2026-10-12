import { expect, setHelp, test } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

for (const language of ['pl', 'en']) {
	for (const [member, verb] of [
		['w001', 'w002'],
		['w010', 'w011']
	]) {
		test(`@reader ${language}: comparative bonum retains its actual form at ${member}`, async ({
			page
		}) => {
			const slug = 'dominica-xiv-post-pentecosten-graduale';
			const route = `/app/${language}/formularium/dominica-xiv-post-pentecosten`;
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`${route}?w=${slug}.${member}`);
			const panel = page.locator('aside.panel[role="dialog"]');
			let adjective = panel;
			if (language === 'en') {
				await expect(panel.locator('.form')).toHaveText('Bonum est');
				await expect(panel.locator('.context-layer > .gloss')).toHaveText('It is better');
				await expect(panel.locator('.construction-title')).toHaveText(['Bonum', 'est']);
				adjective = panel.locator('.construction-card').filter({
					has: page.locator('.construction-title').filter({ hasText: /^Bonum$/ })
				});
				const predicate = panel.locator('.construction-card').filter({
					has: page.locator('.construction-title').filter({ hasText: /^est$/ })
				});
				await expect(predicate.locator('.morph')).toContainText('present');
				await expect(predicate.locator('.morph')).toContainText('indicative');
			} else {
				await expect(panel.locator('.form')).toHaveText('Bonum');
				await expect(panel.locator('.construction-card')).toHaveCount(0);
			}
			await expect(adjective).toHaveCount(1);
			await expect(adjective.locator('.morph')).toContainText(
				language === 'pl' ? 'przymiotnik' : 'adjective'
			);
			await expect(adjective.locator('.morph')).not.toContainText(
				language === 'pl' ? 'stopień wyższy' : 'comparative'
			);
			await expect(adjective).toContainText(
				language === 'pl'
					? '„Bonum” ma formę stopnia równego, lecz w połączeniu z „quam” wyraża tu porównanie: „lepiej … niż …”.'
					: '“Bonum” is positive in form, but with “quam” it expresses a comparison here: “better … than …”.'
			);
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			await page.keyboard.press('Escape');
			await expect(panel).toHaveCount(0);
			await setHelp(page, 1);
			const button = page.locator(`button[id="${slug}.${language === 'en' ? verb : member}"]`);
			await expect(button.locator('rt')).toHaveText(language === 'pl' ? 'Lepiej' : 'It is better');
			if (language === 'pl') {
				await expect(page.locator(`button[id="${slug}.${verb}"] rt`)).toHaveText('jest');
			} else {
				await expect(button.locator('.token')).toHaveCount(2);
				await page.evaluate(() => document.fonts.ready);
				const group = page.locator('.token-group').filter({ has: button });
				await expect(group).toHaveCount(1);
				const measurements = await group.evaluate(interlinearGeometry);
				expect(measurements).toHaveLength(1);
				expect(measurements[0].sourceClipping).toEqual([]);
				expect(measurements[0].captionClipping).toEqual([]);
				expect(measurements[0].clearance).toBeGreaterThanOrEqual(0);
				await page.goto(`${route}?w=${slug}.${verb}`);
				await expect(panel.locator('.form')).toHaveText('Bonum est');
				await expect(panel.locator('.construction-title')).toHaveText(['Bonum', 'est']);
			}
		});
	}
}

import { expect, setHelp, test } from './fixtures';

const formulary = 'dominica-xxi-post-pentecosten';
const text = `${formulary}-epistola`;

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} Ephesians 6 keeps the negative predicate together`, async ({ page }) => {
		await page.goto(route);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.w024"]`);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ colorScheme });
			await expect(button.locator('rt')).toHaveText(
				language === 'pl' ? 'nie toczymy walki' : 'our struggle is not'
			);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card .construction-title')).toHaveText([
				'non',
				'est',
				'nobis',
				'colluctátio'
			]);
			await page.keyboard.press('Escape');
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
	});

	test(`${language} Ephesians 6 preserves pending gender, prose and source framing`, async ({
		page
	}) => {
		await page.goto(`${route}?w=${text}.w083`);
		const panel =
			language === 'pl'
				? page.locator('aside .construction-card', {
						has: page.locator('.construction-title', { hasText: /^quo$/ })
					})
				: page.locator('aside');
		await expect(panel.locator('.morph')).toContainText(language === 'pl' ? 'nijaki' : 'neuter');
		await expect(panel.locator('.meta')).toContainText(
			language === 'pl' ? 'do przeglądu' : 'awaiting review'
		);
		await expect(panel.locator('.meta')).not.toContainText(
			language === 'pl' ? 'zaakceptowane' : 'accepted'
		);
		await expect(panel.locator('.meta')).toContainText('Whitaker');
		await expect(panel.locator('.meta')).toContainText('Collatinus');
		await page.keyboard.press('Escape');
		await setHelp(page, 1);
		const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
		await expect(part.locator('.token')).toHaveCount(100);
		const targets =
			language === 'pl'
				? [['w067', 'przywdziawszy']]
				: [
						['w010', 'Clothe'],
						['w011', 'yourselves'],
						['w012', 'with armor']
					];
		for (const [word, gloss] of targets) {
			await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await setHelp(page, 2);
		await expect(part.locator('.translation')).toContainText(
			language === 'pl'
				? 'i ostać się, doskonali we wszystkim'
				: 'the rulers of this world of darkness'
		);
		await part
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources.locator('li')).toHaveCount(3);
		await expect(sources).toContainText(
			'Latin/Tempora/Pent21-0.txt [Lectio], marker25, title26, reference27, body28'
		);
		await expect(sources).toContainText('p. 408 · leaf n489 / PDF p. 490');
		await expect(sources).toContainText('p. 409 · leaf n490 / PDF p. 491');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n489/mode/1up"]'
			)
		).toHaveCount(1);
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n490/mode/1up"]'
			)
		).toHaveCount(1);
	});
}

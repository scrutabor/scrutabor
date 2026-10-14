import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

for (const language of ['pl', 'en'] as const) {
	test(`@reader ${language} Low Sunday repeats the printed milk adjective`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/dominica-in-albis`);
		await setHelp(page, 1);
		for (const word of ['w006', 'w046']) {
			const token = page.locator(`button[id="dominica-in-albis-introitus.${word}"]`);
			await expect(token.locator('.base')).toHaveText(/rationábile/);
			await token.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toContainText(language === 'pl' ? 'nijaki' : 'neuter');
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		}
	});

	for (const date of ['2026-04-12', '2026-04-19', '2026-04-26', '2026-05-03', '2026-05-10']) {
		test(`@reader ${language} ${date} uses the seasonal Easter Preface`, async ({ page }) => {
			await page.goto(`/app/${language}/ordo/canon?dies=${date}`);
			await setHelp(page, 1);
			await expect(page.locator('[id="praefatio-paschalis.w016"] .base')).toHaveText('hoc');
			await expect(page.locator('[id="praefatio-paschalis-in-die.w016"]')).toHaveCount(0);
			await expect(page.locator('[id="praefatio-paschalis-in-nocte.w016"]')).toHaveCount(0);
			await expect(page.locator('[id="communicantes-in-die-paschae.w001"]')).toHaveCount(0);
		});
	}

	for (const width of [320, 1280]) {
		test(`@reader ${language} seasonal Preface shows its own sources at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/app/${language}/ordinarium/praefatio-paschalis`);
			await page
				.getByRole('button', {
					name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
				})
				.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toContainText(
				language === 'pl'
					? 'tylko wtedy, gdy nie mają prefacji własnej'
					: 'only when they have no proper Preface'
			);
			const notes = dialog.locator('details.source-notes');
			await notes.locator('summary').click();
			const printed = notes.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n370/mode/1up"]'
			);
			await expect(printed).toHaveCount(1);
			await expect(printed).toBeVisible();
			await expect(notes).toContainText('p. 291');
			await expect(notes).toContainText('p. 288');
			await expect(
				notes.locator(
					'a[href="https://archive.org/details/missale-romanum-1962/page/n304/mode/1up"]'
				)
			).toHaveCount(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		});
	}
}

test('@reader Polish Thomas keeps the joint condition and negative government', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.goto('/app/pl/formularium/dominica-in-albis');
	await setHelp(page, 1);
	await expect(page.locator('[id="dominica-in-albis-evangelium.w108"] rt')).toHaveText(
		'Dopóki nie'
	);
	for (const [word, gloss] of [
		['w117', 'palca'],
		['w124', 'ręki']
	]) {
		await expect(page.locator(`[id="dominica-in-albis-evangelium.${word}"] rt`)).toHaveText(gloss);
	}
	const group = page.locator('.token-group').filter({
		has: page.locator('button[id="dominica-in-albis-evangelium.w116"]')
	});
	for (const [width, theme] of [
		[320, 'dark'],
		[1280, 'light']
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await setTheme(page, theme);
		await expectSharedGloss(page, group, 2, 'i nie włożę', undefined, {
			neighborInk: true
		});
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	}
	await setHelp(page, 2);
	await expect(
		page.locator('#text-proprium-dominica-in-albis-evangelium .translation')
	).toContainText('Nie uwierzę, chyba że');
});

test('@reader English Low Sunday keeps the perfect birth construction', async ({ page }) => {
	await page.goto('/app/en/formularium/dominica-in-albis');
	await setHelp(page, 1);
	const group = page.locator('.token-group').filter({
		has: page.locator('button[id="dominica-in-albis-epistola.w004"]')
	});
	await expectSharedGloss(page, group, 2, 'has been born', undefined, {
		neighborInk: true
	});
});

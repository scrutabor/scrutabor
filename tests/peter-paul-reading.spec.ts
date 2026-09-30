import { expect, setHelp, test } from './fixtures';

const formulary = 'sancti-petri-et-pauli-apostolorum';
const text = `${formulary}-epistola`;
const groups = [
	['pl', 'w024', 'przystąpił do', ['appósuit', 'ut']],
	['pl', 'w034', 'Gdy go', ['Quem', 'cum']],
	['pl', 'w074', 'tej samej', ['in', 'ipsa']],
	['pl', 'w156', 'że widzi widzenie', ['se', 'visum', 'vidére']],
	['en', 'w074', 'that same', ['in', 'ipsa']],
	['en', 'w122', 'put on', ['cálcea', 'te']]
] as const;

for (const [language, anchor, gloss, words] of groups) {
	test(`${language} Acts 12 ${anchor} preserves its complete construction`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${anchor}"]`);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ colorScheme });
			await expect(button.locator('rt')).toHaveText(gloss);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card .construction-title')).toHaveText([
				...words
			]);
			await page.keyboard.press('Escape');
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} Acts 12 shows corrected genders without implying acceptance`, async ({
		page
	}) => {
		for (const [word, gender] of [
			['w010', language === 'pl' ? 'męski' : 'masculine'],
			['w167', language === 'pl' ? 'żeński' : 'feminine'],
			['w171', language === 'pl' ? 'żeński' : 'feminine']
		]) {
			await page.goto(`${route}?w=${text}.${word}`);
			await expect(page.locator('aside .morph')).toContainText(gender);
			await expect(page.locator('aside .meta')).toContainText(
				language === 'pl' ? 'do przeglądu' : 'awaiting review'
			);
			await expect(page.locator('aside .meta')).not.toContainText(
				language === 'pl' ? 'zaakceptowane' : 'accepted'
			);
			await expect(page.locator('aside .meta')).toContainText('Whitaker');
			await expect(page.locator('aside .meta')).toContainText('Collatinus');
		}
	});

	test(`${language} Acts 12 keeps the whole reading and corrected direct glosses`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const part = page.locator('.proper-part', {
			has: page.locator(`[id="${text}.w001"]`)
		});
		await expect(part.locator('.token')).toHaveCount(212);
		const glosses =
			language === 'pl'
				? [
						['w026', 'pojmania'],
						['w078', 'spał'],
						['w101', 'i uderzywszy'],
						['w122', 'włóż']
					]
				: [
						['w004', 'stretched out'],
						['w042', 'soldiers'],
						['w101', 'and striking'],
						['w183', 'departed']
					];
		for (const [word, gloss] of glosses) {
			await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await setHelp(page, 2);
		await expect(part.locator('.translation')).toContainText(
			language === 'pl' ? 'brama sama otworzyła się przed nimi' : 'Herod was going to bring him out'
		);
	});

	test(`${language} Acts 12 exposes both source pages and complete reading boundaries`, async ({
		page
	}) => {
		await page.goto(route);
		const part = page.locator('.proper-part', {
			has: page.locator(`[id="${text}.w001"]`)
		});
		await part
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('marker27, announcement28, reference29, complete body30');
		for (const sourcePage of ['n657', 'n658']) {
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/${sourcePage}/mode/1up"]`
				)
			).toHaveCount(1);
		}
	});
}

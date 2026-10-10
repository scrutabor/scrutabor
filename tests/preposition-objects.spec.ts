import { expect, setHelp, setTheme, test } from './fixtures';

const pairs = [
	['commemoratio-baptismatis-domini', 'evangelium', 'w045', 'to', 'w046', 'Israel'],
	['commemoratio-baptismatis-domini', 'evangelium', 'w050', 'with', 'w051', 'water'],
	['commemoratio-baptismatis-domini', 'evangelium', 'w079', 'with', 'w080', 'water']
] as const;

for (const [formulary, part, prep, prepGloss, noun, nounGloss] of pairs) {
	test(`${formulary} ${prep} keeps the preposition and noun distinct`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, colorScheme);
			for (const [word, gloss] of [
				[prep, prepGloss],
				[noun, nounGloss]
			]) {
				const button = page.locator(`button[id="${formulary}-${part}.${word}"]`);
				await expect(button.locator('rt')).toHaveText(gloss);
				await button.scrollIntoViewIfNeeded();
				const before = await button.boundingBox();
				await button.hover();
				expect(await button.boundingBox()).toEqual(before);
				await button.click();
				await expect(page.getByRole('region', { name: 'meaning in context' })).toHaveText(gloss);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
				await page.keyboard.press('Escape');
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(page.locator(`button[id="${formulary}-${part}.${prep}"] rt`)).toHaveText(
			prepGloss
		);
		await expect(page.locator(`button[id="${formulary}-${part}.${noun}"] rt`)).toHaveText(
			nounGloss
		);
	});
}

test('Epiphany III preserves the complete overcome evil with good construction', async ({
	page
}) => {
	const text = 'dominica-iii-post-epiphaniam-epistola';
	const route = '/app/en/formularium/dominica-iii-post-epiphaniam';
	const gloss = 'overcome evil with good';
	const members = [
		[
			'w078',
			'vince',
			'vinco',
			'verb — 2nd person, singular, present, imperative, active, 3rd conjugation'
		],
		['w079', 'in', 'in', 'preposition (with the ablative)'],
		['w080', 'bono', 'bonum', 'noun — ablative, singular, neuter, 2nd declension'],
		['w081', 'malum', 'malum', 'noun — accusative, singular, neuter, 2nd declension']
	] as const;
	await page.goto(route);
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await setHelp(page, 1);
	await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
	await expect(page.locator('html')).toHaveCSS('font-size', '22.4px');
	const button = page.locator(`button[id="${text}.w078"]`);
	const forms = members.map(([, form]) => form);
	for (const [width, theme] of [
		[320, 'light'],
		[1280, 'dark']
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await setTheme(page, theme);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(4);
		await button.scrollIntoViewIfNeeded();
		const before = await button.boundingBox();
		await button.hover();
		expect(await button.boundingBox()).toEqual(before);
		await button.click();
		await expect(
			page.getByRole('region', { name: 'meaning in context' }).locator('.gloss')
		).toHaveText(gloss);
		await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText(forms);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
		await page.keyboard.press('Escape');
	}
	for (const [id] of members) {
		await page.goto(`${route}?w=${text}.${id}`);
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
		await expect(dialog.locator('.construction-card')).toHaveCount(4);
		await expect(dialog.locator('.construction-title')).toHaveText(forms);
		for (const [index, [, , lemma, morphology]] of members.entries()) {
			const card = dialog.locator('.construction-card').nth(index);
			await expect(card.locator('.head > a')).toHaveAttribute('href', `/app/en/lemma?l=${lemma}`);
			await expect(card.locator('.morph')).toHaveText(morphology);
		}
		await page.keyboard.press('Escape');
	}
	await page.emulateMedia({ media: 'print' });
	await expect(button.locator('rt')).toBeVisible();
	await expect(button.locator('rt')).toHaveText(gloss);
	await expect(button.locator('.token')).toHaveCount(4);
	await expect(button.locator('.base')).toHaveText(['vince', 'in', 'bono', 'malum.']);
});

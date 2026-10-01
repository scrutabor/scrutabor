import { expect, setHelp, setTheme, test } from './fixtures';

const formularies = [
	'annuntiatio-beatae-mariae-virginis',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii',
	'dedicatio-archibasilicae-sanctissimi-salvatoris',
	'dedicatio-sancti-michaelis-archangeli',
	'omnium-sanctorum',
	'sancti-matthiae-apostoli',
	'sancti-petri-et-pauli-apostolorum',
	'sancti-stephani-protomartyris',
	'sanctissimi-nominis-iesu',
	'sanctorum-innocentium-martyrum',
	'vigilia-pentecostes'
];

for (const formulary of formularies) {
	test(`${formulary} keeps the English opening together with both Latin analyses`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const text = `${formulary}-epistola`;
		const route = `/app/en/formularium/${formulary}`;
		await page.goto(route);
		await setHelp(page, 1);
		const pair = page.locator(`button[id="${text}.w002"]`);
		await expect(pair.locator('rt')).toHaveText('those days');
		await expect(pair).toHaveAccessibleName(/^diébus illis[:,]? — those days$/);
		await expect(pair.locator('.token')).toHaveCount(2);
		await expect(page.locator(`button[id="${text}.w003"]`)).toHaveCount(0);
		await expect(page.locator(`button[id="${text}.w001"] rt`)).toHaveText(/^[Ii]n$/);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await pair.scrollIntoViewIfNeeded();
			const before = await pair.boundingBox();
			await pair.hover();
			expect(await pair.boundingBox()).toEqual(before);
			await pair.focus();
			await pair.press('Enter');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('header .form')).toHaveText('diébus illis');
			await expect(dialog.locator('.construction-title')).toHaveText(['diébus', 'illis']);
			await expect(dialog.locator('.construction-card .morph')).toHaveCount(2);
			for (const [index, member] of ['w002', 'w003'].entries()) {
				const card = dialog.locator('.construction-card').nth(index);
				await expect(card.locator('.construction-title')).toHaveAttribute(
					'id',
					new RegExp(`${member}-title$`)
				);
				await expect(card.locator('.morph')).toContainText('ablative');
				await expect(card.locator('.morph')).toContainText('plural');
			}
			await expect(dialog).toContainText('those days');
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
		}
		await page.emulateMedia({ media: 'print' });
		await expect(pair.locator('rt')).toBeVisible();
		await expect(pair.locator('rt')).toHaveText('those days');
		await page.emulateMedia({ media: 'screen' });
		for (const member of ['w002', 'w003']) {
			await page.goto(`${route}?w=${text}.${member}`);
			await expect(page.getByRole('dialog').locator('header .form')).toHaveText('diébus illis');
			await expect(page.locator('aside .construction-title')).toHaveText(['diébus', 'illis']);
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
		}
	});
}

test('the Polish Annunciation opening keeps independently inflected words', async ({ page }) => {
	await page.goto('/app/pl/formularium/annuntiatio-beatae-mariae-virginis');
	await setHelp(page, 1);
	const text = 'annuntiatio-beatae-mariae-virginis-epistola';
	for (const [word, gloss] of [
		['w001', 'w'],
		['w002', 'dniach'],
		['w003', 'owych']
	]) {
		const button = page.locator(`button[id="${text}.${word}"]`);
		await expect(button).toHaveClass(/\bword\b/);
		await expect(button).not.toHaveClass(/word-construction/);
		await expect(button.locator('..')).toHaveClass(/\btoken\b/);
		await expect(button.locator('ruby')).toHaveCount(1);
		await expect(button.locator('rt')).toHaveText(gloss);
	}
	await page.locator(`button[id="${text}.w002"]`).click();
	await expect(page.getByRole('dialog').locator('header .form')).toHaveText('diébus');
	await expect(page.locator('aside .construction-card')).toHaveCount(0);
	await expect(page.getByRole('dialog')).toContainText('dniach');
});

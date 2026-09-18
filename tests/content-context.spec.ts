import { expect, setHelp, test } from './fixtures';

for (const [language, negative, purified] of [
	['pl', 'nieobłudnej', 'oczyszczonym rozumieniem umysłu'],
	['en', 'unfeigned', 'with purified understanding of the mind']
] as const) {
	test(`${language}: non ficta has one negative gloss`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/dominica-i-in-quadragesima`);
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'non ficta' });
		await expect(group.locator('rt')).toHaveText(negative);
		await group.locator('button.word-construction').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(2);
	});

	test(`${language}: a three-word construction preserves its shared meaning`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/transfiguratio-domini`);
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'purificáta mentis intellegéntia' });
		await expect(group.locator('rt')).toHaveText(purified);
		await group.locator('button.word-construction').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(3);
	});
}

test('the sequence translations stay attached to the correct Latin stanza', async ({ page }) => {
	const slug = 'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia';
	await page.goto('/app/en/formularium/commemoratio-omnium-fidelium-defunctorum');
	await setHelp(page, 2);
	const translation = (id: string) =>
		page.locator(`#${slug}-${id}`).locator('xpath=following-sibling::div[1]/p');
	await expect(translation('s15')).toContainText('Your sheep');
	await expect(translation('s15')).toContainText('Your right');
	await expect(translation('s16')).toContainText('the cursed');
	await expect(translation('s16')).toContainText('the blessed');
});

test('the Preface has no duplicated demonstrative in its shared gloss', async ({ page }) => {
	await page.goto('/app/en/ordinarium/praefatio-defunctorum');
	await setHelp(page, 1);
	const group = page.locator('.token-group', { hasText: 'terréstris huius incolátus' });
	await expect(group.locator('rt')).toHaveText('of this earthly sojourn');
});

test('the genealogy opens a book definition and a genitive name', async ({ page }) => {
	const route = '/app/pl/formularium/sancti-ioachim-confessoris';
	const slug = 'sancti-ioachim-confessoris-evangelium';
	await page.goto(`${route}?w=${slug}.w001`);
	await expect(page.locator('aside')).toContainText('księga');
	await expect(page.locator('aside')).toContainText('rzeczownik');
	await page.goto(`${route}?w=${slug}.w003`);
	await expect(page.locator('aside')).toContainText('dopełniacz');
});

test('a repeated Proper keeps distinct word and verse selections after reload', async ({
	page
}) => {
	const route = '/app/pl/formularium/dominica-i-in-quadragesima';
	const slug = 'dominica-i-in-quadragesima-offertorium';
	await page.goto(route);
	const sections = page
		.locator('.proper-part')
		.filter({ has: page.locator(`button[id="${slug}~communio.w001"]`) });
	await expect(sections).toHaveCount(1);
	const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
		const ids = elements.map((el) => el.id);
		return ids.filter((id, i) => ids.indexOf(id) !== i);
	});
	expect(duplicateIds).toEqual([]);
	await page.locator(`button[id="${slug}~communio.w001"]`).click();
	await expect(page.locator('button.word.selected')).toHaveCount(1);
	await page.reload();
	await expect(page.locator(`button[id="${slug}~communio.w001"]`)).toHaveClass(/selected/);
	await expect(page.locator('button.word.selected')).toHaveCount(1);
	await page.goto(`${route}?s=${slug}~communio.s01`);
	await expect(page.locator(`[id="${slug}~communio-s01"]`)).toHaveClass(/segment-selected/);
	await expect(page.locator('.segment-selected')).toHaveCount(1);
});

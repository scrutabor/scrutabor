import { atRoute, expect, settled, test } from './fixtures';

async function openSearch(page: import('@playwright/test').Page, language: 'pl' | 'en' = 'pl') {
	await page.goto(`/app/${language}`);
	await page.getByRole('button', { name: language === 'pl' ? 'szukaj' : 'search' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test('title, passage, and grammar results remain visibly separate', async ({ page }) => {
	const dialog = await openSearch(page);
	await dialog.getByRole('searchbox').fill('Pater');

	const headings = dialog.locator('.results h3');
	await expect(headings).toHaveText(['tytuły modlitw', 'fragmenty tekstów', 'analiza gramatyczna']);
	await expect(dialog.getByText('tytuł', { exact: true }).first()).toBeVisible();
	await expect(dialog.getByText('tekst łaciński', { exact: true }).first()).toBeVisible();
	await expect(dialog.getByText('gramatyka', { exact: true }).first()).toBeVisible();
	await expect(dialog.locator('#search-titles + ul li').first()).toContainText('Ojcze nasz');
});

test('search controls are centred and the focused field stays visually neutral', async ({
	page
}) => {
	const trigger = page.getByRole('button', { name: 'szukaj' });
	await page.goto('/app/pl');
	await expect(trigger).toBeVisible();
	const triggerCentres = await trigger.evaluate((button) => {
		const control = button.getBoundingClientRect();
		const icon = button.querySelector('svg')!.getBoundingClientRect();
		return {
			x: Math.abs((control.left + control.right - icon.left - icon.right) / 2),
			y: Math.abs((control.top + control.bottom - icon.top - icon.bottom) / 2)
		};
	});
	expect(triggerCentres.x).toBeLessThan(0.6);
	expect(triggerCentres.y).toBeLessThan(0.6);

	await trigger.click();
	const dialog = page.getByRole('dialog');
	const field = dialog.getByRole('searchbox');
	await expect(field).toBeFocused();
	await expect(field).not.toHaveAttribute('placeholder');
	expect(await field.evaluate((input) => getComputedStyle(input).outlineStyle)).toBe('none');

	const close = dialog.getByRole('button', { name: 'zamknij' });
	const closeCentres = await close.evaluate((button) => {
		const control = button.getBoundingClientRect();
		const icon = button.querySelector('svg')!.getBoundingClientRect();
		return {
			x: Math.abs((control.left + control.right - icon.left - icon.right) / 2),
			y: Math.abs((control.top + control.bottom - icon.top - icon.bottom) / 2)
		};
	});
	expect(closeCentres.x).toBeLessThan(0.6);
	expect(closeCentres.y).toBeLessThan(0.6);
});

test('completed results remain visible until their replacement is ready', async ({ page }) => {
	const dialog = await openSearch(page);
	const field = dialog.getByRole('searchbox');
	await field.fill('Pater');
	const titles = dialog.locator('#search-titles + ul');
	await expect(titles).toContainText('Ojcze nasz');

	await field.fill('Duszo Chrystusowa');
	await expect(titles).toContainText('Ojcze nasz');
	await expect(titles).toContainText('Duszo Chrystusowa');
});

test('search is case-insensitive while results retain devotional capitalization', async ({
	page
}) => {
	const dialog = await openSearch(page);
	const pious = 'Duszo Chrystusowa';
	await dialog.getByRole('searchbox').fill(pious.toLocaleUpperCase('pl'));
	const title = dialog.locator('#search-titles + ul li').first();
	await expect(title).toContainText(pious);
	await expect(title).toContainText('Ánima Christi');
});

test('a translation passage opens and marks the exact segment', async ({ page }) => {
	const dialog = await openSearch(page);
	await dialog.getByRole('searchbox').fill('Uświęć mnie');
	const passage = dialog.locator('#search-contents + ul a[href*="anima-christi?s=s01"]');
	await expect(passage).toContainText('Duszo Chrystusowa');
	await passage.click();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/anima-christi', '?s=s01'));
	await expect(page.locator('#s01.search-hit')).toBeVisible();
});

test('minor mistakes and missing diacritics still find a familiar title', async ({ page }) => {
	const dialog = await openSearch(page);
	await dialog.getByRole('searchbox').fill('Najświętsza Panmo');
	await expect(dialog.locator('#search-titles + ul li').first()).toContainText(
		'Pomnij, o Najświętsza Panno Maryjo'
	);
	await dialog.getByRole('searchbox').fill('Najswietsza Panno');
	await expect(dialog.locator('#search-titles + ul li').first()).toContainText(
		'Pomnij, o Najświętsza Panno Maryjo'
	);
});

test('a Latin inflection offers the dictionary entry last', async ({ page }) => {
	const dialog = await openSearch(page, 'en');
	await dialog.getByRole('searchbox').fill('Patris');
	const grammar = dialog.locator('#search-grammar + ul li').first();
	await expect(grammar).toContainText('pater, patris');
	await grammar.getByRole('link').click();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/en/lemma/pater'));
});

test('Escape closes search and returns focus to the page', async ({ page }) => {
	const dialog = await openSearch(page);
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'szukaj' })).toBeFocused();
});

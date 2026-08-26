import { atRoute, expect, settled, test } from './fixtures';

async function openSearchPage(page: import('@playwright/test').Page, language: 'pl' | 'en' = 'pl') {
	await page.goto(`/app/${language}/search`);
	const field = page.getByRole('searchbox');
	await expect(field).toBeFocused();
	return field;
}

test('the visible search control opens a stable dedicated page', async ({ page }) => {
	await page.goto('/app/pl');
	const trigger = page.getByRole('link', { name: 'szukaj' });
	await expect(trigger).toBeVisible();
	const triggerCentres = await trigger.evaluate((link) => {
		const control = link.getBoundingClientRect();
		const icon = link.querySelector('svg')!.getBoundingClientRect();
		return {
			x: Math.abs((control.left + control.right - icon.left - icon.right) / 2),
			y: Math.abs((control.top + control.bottom - icon.top - icon.bottom) / 2)
		};
	});
	expect(triggerCentres.x).toBeLessThan(0.6);
	expect(triggerCentres.y).toBeLessThan(0.6);

	await trigger.click();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/pl/search'));
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wyszukiwanie');
	const field = page.getByRole('searchbox');
	await expect(field).toBeFocused();
	await expect(field).not.toHaveAttribute('placeholder');

	const before = await field.evaluate((input) => input.getBoundingClientRect().top);
	await field.fill('Pater');
	await expect(page.locator('#search-titles + ul')).toContainText('Ojcze nasz');
	const after = await field.evaluate((input) => input.getBoundingClientRect().top);
	expect(Math.abs(after - before)).toBeLessThan(0.6);
});

test('title, passage, and grammar results remain visibly separate', async ({ page }) => {
	const field = await openSearchPage(page);
	await field.fill('Pater');

	const headings = page.locator('.results h2');
	await expect(headings).toHaveText(['tytuły modlitw', 'fragmenty tekstów', 'analiza gramatyczna']);
	await expect(page.getByText('tytuł', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('tekst łaciński', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('gramatyka', { exact: true }).first()).toBeVisible();
	await expect(page.locator('#search-titles + ul li').first()).toContainText('Ojcze nasz');
});

test('completed results remain visible until their replacement is ready', async ({ page }) => {
	const field = await openSearchPage(page);
	await field.fill('Pater');
	const titles = page.locator('#search-titles + ul');
	await expect(titles).toContainText('Ojcze nasz');

	await field.fill('Duszo Chrystusowa');
	await expect(titles).toContainText('Ojcze nasz');
	await expect(titles).toContainText('Duszo Chrystusowa');
});

test('search is case-insensitive while results retain devotional capitalization', async ({
	page
}) => {
	const field = await openSearchPage(page);
	const pious = 'Duszo Chrystusowa';
	await field.fill(pious.toLocaleUpperCase('pl'));
	const title = page.locator('#search-titles + ul li').first();
	await expect(title).toContainText(pious);
	await expect(title).toContainText('Ánima Christi');
});

test('highlighting marks the found word without its preceding space', async ({ page }) => {
	const field = await openSearchPage(page);
	await field.fill('Da');
	const mark = page.locator('#search-contents + ul mark').first();
	await expect(mark).toBeVisible();
	const found = await mark.textContent();
	expect(found).toBe(found?.trim());
	expect(found?.toLocaleLowerCase()).toBe('da');
});

test('a translation passage opens and marks the exact segment', async ({ page }) => {
	const field = await openSearchPage(page);
	await field.fill('Uświęć mnie');
	const passage = page.locator('#search-contents + ul a[href*="anima-christi?s=s01"]');
	await expect(passage).toContainText('Duszo Chrystusowa');
	await passage.click();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/anima-christi', '?s=s01'));
	await expect(page.locator('#s01.search-hit')).toBeVisible();
});

test('a marked verse fits its text and clears neighbouring interlinear glosses', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/app/pl/orationes/angelus-domini?s=s01');
	const short = await page.locator('#s01.search-hit').evaluate((element) => {
		const verse = element.getBoundingClientRect();
		const measure = element.parentElement!.getBoundingClientRect();
		const tokens = [...element.querySelectorAll('.token')].map((token) =>
			token.getBoundingClientRect()
		);
		const glosses = [...element.querySelectorAll('rt')].map((gloss) =>
			gloss.getBoundingClientRect()
		);
		return {
			width: verse.width,
			measure: measure.width,
			rightAir: verse.right - Math.max(...tokens.map((token) => token.right)),
			bottomAir: verse.bottom - Math.max(...glosses.map((gloss) => gloss.bottom))
		};
	});
	expect(short.width, 'a short hit inherited the full reading measure').toBeLessThan(
		short.measure * 0.75
	);
	expect(short.rightAir, 'the rule touches the last word').toBeGreaterThan(2);
	expect(short.bottomAir, 'the rule touches the interlinear gloss').toBeGreaterThan(4);

	await page.goto('/app/pl/orationes/angelus-domini?s=s13');
	const long = await page.locator('#s13.search-hit').evaluate((element) => {
		const verse = element.getBoundingClientRect();
		const rule = getComputedStyle(element, '::after');
		const preceding = document.querySelectorAll('#s12 rt');
		return {
			topAir:
				verse.top +
				parseFloat(rule.top) -
				Math.max(...[...preceding].map((gloss) => gloss.getBoundingClientRect().bottom)),
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
		};
	});
	expect(long.topAir, 'the rule touches the preceding interlinear gloss').toBeGreaterThan(2);
	expect(long.overflow, 'the long marked verse widens the page').toBe(0);
});

test('minor mistakes and missing diacritics still find a familiar title', async ({ page }) => {
	const field = await openSearchPage(page);
	await field.fill('Najświętsza Panmo');
	await expect(page.locator('#search-titles + ul li').first()).toContainText(
		'Pomnij, o Najświętsza Panno Maryjo'
	);
	await field.fill('Najswietsza Panno');
	await expect(page.locator('#search-titles + ul li').first()).toContainText(
		'Pomnij, o Najświętsza Panno Maryjo'
	);
});

test('a Latin inflection offers the dictionary entry last', async ({ page }) => {
	const field = await openSearchPage(page, 'en');
	await field.fill('Patris');
	const grammar = page.locator('#search-grammar + ul li').first();
	await expect(grammar).toContainText('pater, patris');
	await grammar.getByRole('link').click();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/en/lemma/pater'));
});

test('typing replaces one query entry instead of filling browser history', async ({ page }) => {
	await page.goto('/app/pl');
	await page.getByRole('link', { name: 'szukaj' }).click();
	await settled(page);
	await page.getByRole('searchbox').pressSequentially('Pater', { delay: 35 });
	await expect(page).toHaveURL(atRoute('/app/pl/search', '?q=Pater'));
	await page.goBack();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/pl'));
});

test('Back restores the query, results, and scroll position before a second result is opened', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 520 });
	const field = await openSearchPage(page);
	await field.fill('Pater');
	const hits = page.locator('#search-contents + ul a');
	await expect(hits.nth(5)).toBeVisible();
	const firstHref = await hits.nth(4).getAttribute('href');
	const secondHref = await hits.nth(5).getAttribute('href');
	expect(secondHref).not.toBe(firstHref);
	await hits.nth(4).evaluate((element) => element.scrollIntoView({ block: 'center' }));
	await hits.nth(4).click();
	await settled(page);
	const before = await page.evaluate(() => {
		const saved = sessionStorage.getItem('scrutabor-search-return');
		return saved ? (JSON.parse(saved).y as number) : -1;
	});
	expect(before).toBeGreaterThan(0);

	await page.goBack();
	await settled(page);
	await expect(page).toHaveURL(atRoute('/app/pl/search', '?q=Pater'));
	await expect(page.getByRole('searchbox')).toHaveValue('Pater');
	await expect(page.locator('#search-contents + ul a').nth(5)).toHaveAttribute('href', secondHref!);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(before - 2);

	await page.locator('#search-contents + ul a').nth(5).click();
	await settled(page);
	await expect(page).not.toHaveURL(atRoute('/app/pl/search', '?q=Pater'));
});

test('the visible search control refocuses the full search field without losing its query', async ({
	page
}) => {
	const field = await openSearchPage(page);
	await field.fill('Pater');
	await expect(field).toHaveValue('Pater');
	await page.getByRole('link', { name: 'strona główna modlitewnika' }).focus();
	await page.getByRole('link', { name: 'szukaj' }).click();
	await expect(field).toBeFocused();
	await expect(field).toHaveValue('Pater');
	await expect(page.getByRole('dialog')).not.toBeVisible();
});

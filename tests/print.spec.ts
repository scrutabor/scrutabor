import { expect, test } from './fixtures';

async function readingSize(page: import('@playwright/test').Page) {
	return page
		.locator('.verse')
		.first()
		.evaluate((verse) => parseFloat(getComputedStyle(verse).fontSize));
}

test('print uses compact paper typography and removes application chrome', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-theme', 'dark');
		localStorage.setItem('scrutabor-reading', 'largest');
		localStorage.setItem('scrutabor-help', '2');
	});
	await page.emulateMedia({ media: 'print' });
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/psalmi/118-he?w=w014');

	for (const selector of [
		'.page.reading > header nav',
		'.help-row',
		'.about-pill',
		'.pager',
		'.source-notes',
		'.sheet:not(.inline)'
	]) {
		await expect(page.locator(selector), `${selector} is print chrome`).toBeHidden();
	}

	const printed = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const body = getComputedStyle(document.body);
		const page = getComputedStyle(document.querySelector('.page')!);
		const main = getComputedStyle(document.querySelector('main')!);
		return {
			rootSize: parseFloat(root.fontSize),
			background: body.backgroundColor,
			ink: body.color,
			pageMaxWidth: page.maxWidth,
			pagePadding: page.padding,
			panelPadding: main.paddingBottom
		};
	});
	expect(printed.rootSize, 'stored large screen type does not reach paper').toBeCloseTo(13.33, 1);
	expect(await readingSize(page), 'standard paper uses a compact prayer face').toBeCloseTo(14, 1);
	expect(printed.background).toBe('rgb(255, 255, 255)');
	expect(printed.ink).toBe('rgb(17, 17, 17)');
	expect(printed.pageMaxWidth).toBe('none');
	expect(printed.pagePadding).toBe('0px');
	expect(printed.panelPadding).toBe('0px');

	// The breakpoints describe available paper width, so ISO, North American,
	// and custom sheets all receive the same treatment at the same measure.
	await page.setViewportSize({ width: 500, height: 900 });
	expect(await readingSize(page), 'compact paper').toBeCloseTo(12.67, 1);
	await page.setViewportSize({ width: 360, height: 900 });
	expect(await readingSize(page), 'pocket paper').toBeCloseTo(11.67, 1);

	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	await expect(page.locator('.form-tabs')).toBeHidden();
});

test('print expands repeated prayers without printing their disclosure controls', async ({
	page
}) => {
	await page.emulateMedia({ media: 'print' });
	await page.goto('/app/pl/orationes/angelus-domini');

	const repetitions = page.locator('details.repeated-prayer');
	await expect(repetitions).toHaveCount(3);
	for (const summary of await repetitions.locator('summary').all()) {
		await expect(summary).toBeHidden();
	}
	await expect(repetitions.locator('.repeated-body .verse')).toHaveCount(3);
	for (const body of await repetitions.locator('.repeated-body').all()) {
		await expect(body).toBeVisible();
	}
});

test('print lays out the complete Ordo and keeps prayer units intact', async ({ page }) => {
	await page.goto('/app/pl/ordo/canon');
	const folded = page.locator('.part.folded');
	expect(await folded.count(), 'the pew view has silent prayers to expand').toBeGreaterThan(8);
	await expect(folded.first().locator('.part-text')).toHaveCount(0);

	// Browsers fire this before opening the print compositor. Dispatch it
	// directly so the test proves the same complete-document preparation.
	await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
	await page.emulateMedia({ media: 'print' });
	await expect(folded.first().locator('.part-text .verse').first()).toBeVisible();
	await expect(folded.first().locator('.unfold-do')).toBeHidden();

	const breaks = await page.evaluate(() => ({
		verse: getComputedStyle(document.querySelector('.verse')!).breakInside,
		label: getComputedStyle(document.querySelector('.who')!).breakAfter,
		partHead: getComputedStyle(document.querySelector('.part-head')!).breakAfter,
		panel: getComputedStyle(document.querySelector('main')!).paddingBottom
	}));
	expect(breaks).toEqual({ verse: 'avoid', label: 'avoid', partHead: 'avoid', panel: '0px' });
});

test('print keeps litanies paired while the paper is wide enough', async ({ page }) => {
	await page.emulateMedia({ media: 'print' });
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/litaniae/lauretanae');

	const row = page.locator('.litany-pair').first();
	const wide = await row.evaluate((pair) => ({
		columns: getComputedStyle(pair).gridTemplateColumns.split(' ').length,
		breakInside: getComputedStyle(pair).breakInside
	}));
	expect(wide).toEqual({ columns: 2, breakInside: 'avoid' });

	await page.setViewportSize({ width: 300, height: 900 });
	expect(
		await row.evaluate((pair) => getComputedStyle(pair).gridTemplateColumns.split(' ').length)
	).toBe(1);
});

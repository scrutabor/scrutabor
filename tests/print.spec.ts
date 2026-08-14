import { expect, test } from './fixtures';
import { PageSizes, PDFDocument } from 'pdf-lib';

async function readingSize(page: import('@playwright/test').Page) {
	return page
		.locator('.verse')
		.first()
		.evaluate((verse) => parseFloat(getComputedStyle(verse).fontSize));
}

test('print carries the chosen reading settings without application chrome', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-theme', 'dark');
		localStorage.setItem('scrutabor-reading', 'largest');
		localStorage.setItem('scrutabor-help', '2');
		localStorage.setItem('scrutabor-role', 'populus');
		localStorage.setItem('scrutabor-mass-form', 'cantu');
	});
	await page.emulateMedia({ media: 'print' });
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/en/ordinarium/confiteor?w=w014');

	for (const selector of [
		'.page.reading > header nav',
		'.help',
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
	expect(printed.rootSize, 'largest maps to a 14pt print root').toBeCloseTo(18.67, 1);
	expect(await readingSize(page), 'largest standard-paper prayer face').toBeCloseTo(19.6, 1);
	expect(printed.background).toBe('rgb(255, 255, 255)');
	expect(printed.ink).toBe('rgb(17, 17, 17)');
	expect(printed.pageMaxWidth).toBe('none');
	expect(printed.pagePadding).toBe('0px');
	expect(printed.panelPadding).toBe('0px');

	const settings = page.locator('.help-row');
	await expect(settings).toBeVisible();
	await expect(settings.locator('.picker[data-kind="role"] .option.on .real')).toHaveText(
		'faithful'
	);
	await expect(settings.locator('.picker[data-kind="mass"] .option.on .real')).toHaveText('sung');
	for (const option of await settings.locator('.option:not(.on)').all()) {
		await expect(option).toBeHidden();
	}
	const settingRows = await settings
		.locator('.picker')
		.evaluateAll((pickers) => pickers.map((picker) => picker.getBoundingClientRect().top));
	expect(settingRows[0], 'role and Mass share one compact line').toBeCloseTo(settingRows[1], 0);

	// Paper width chooses the baseline; the reader's size then scales it by
	// the same 100/120/140 percent progression as the screen setting.
	for (const [setting, expected] of [
		['normal', 14],
		['larger', 16.8],
		['largest', 19.6]
	] as const) {
		await page.evaluate((value) => (document.documentElement.dataset.reading = value), setting);
		expect(await readingSize(page), `${setting} standard paper`).toBeCloseTo(expected, 1);
	}
	await page.setViewportSize({ width: 500, height: 900 });
	expect(await readingSize(page), 'largest compact paper').toBeCloseTo(17.73, 1);
	await page.setViewportSize({ width: 360, height: 900 });
	expect(await readingSize(page), 'largest pocket paper').toBeCloseTo(16.33, 1);

	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	await expect(page.locator('.form-tabs')).toBeHidden();
});

test('print preserves manually opened repeated prayers and leaves the others folded', async ({
	page
}) => {
	await page.goto('/app/pl/orationes/angelus-domini');

	const repetitions = page.locator('details.repeated-prayer');
	await expect(repetitions).toHaveCount(3);
	await repetitions.first().locator('summary').click();
	await expect(repetitions.first()).toHaveAttribute('open', '');

	await page.emulateMedia({ media: 'print' });
	for (const summary of await repetitions.locator('summary').all()) {
		await expect(summary).toBeVisible();
	}
	for (const action of await repetitions.locator('.repeated-action').all()) {
		await expect(action).toBeHidden();
	}
	await expect(repetitions.nth(0).locator('.repeated-body')).toBeVisible();
	await expect(repetitions.nth(1).locator('.repeated-body')).toBeHidden();
	await expect(repetitions.nth(2).locator('.repeated-body')).toBeHidden();
});

test('print preserves the current Ordo folds and keeps prayer units intact', async ({ page }) => {
	await page.goto('/app/pl/ordo/canon');
	const folded = page.locator('.part.folded');
	expect(await folded.count(), 'the pew view has silent prayers to expand').toBeGreaterThan(8);
	await expect(folded.first().locator('.part-text')).toHaveCount(0);

	const openedTitle = await folded.first().locator('.unfold-title').textContent();
	await folded.first().locator('.unfold').click();
	const opened = page.locator('.part.revealed').filter({ hasText: openedTitle ?? '' });
	await expect(opened.locator('.part-text .verse').first()).toBeVisible();
	const visibleTexts = await page.locator('.part-text').count();

	// Opening the print compositor must not rewrite the reader's choices.
	await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
	await page.emulateMedia({ media: 'print' });
	expect(await page.locator('.part-text').count()).toBe(visibleTexts);
	await expect(page.locator('.part.folded .part-text')).toHaveCount(0);
	await expect(opened.locator('.part-text .verse').first()).toBeVisible();
	await expect(page.locator('.part.folded').first().locator('.unfold-do')).toBeHidden();

	const foldedLine = await page
		.locator('.part.folded')
		.first()
		.evaluate((part) => ({
			title: part.querySelector('.unfold-title')!.getBoundingClientRect().bottom,
			note: part.querySelector('.unfold-what')!.getBoundingClientRect().bottom
		}));
	expect(
		Math.abs(foldedLine.title - foldedLine.note),
		'folded title and note share a baseline'
	).toBeLessThan(1);

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

test('A4 two-up places two complete prayer pages on each sheet', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-reading', 'largest');
		localStorage.setItem('scrutabor-help', '1');
	});
	await page.goto('/app/en/litaniae/lauretanae');
	await page.evaluate(() => document.fonts.ready);

	// A print dialog lays the document out at the selected A4 paper size, then
	// its N-up stage scales two complete A4 pages onto one A4 landscape sheet.
	// Model that exact sequence; the largest text setting compensates for the
	// predictable 1/sqrt(2) reduction and remains above 10pt on the sheet.
	const logicalBytes = await page.pdf({
		format: 'A4',
		printBackground: true,
		preferCSSPageSize: false
	});
	const logical = await PDFDocument.load(logicalBytes);
	expect(logical.getPageCount()).toBeGreaterThan(2);
	const [a4Width, a4Height] = PageSizes.A4;
	for (const prayerPage of logical.getPages()) {
		expect(Math.abs(prayerPage.getWidth() - a4Width)).toBeLessThan(1);
		expect(Math.abs(prayerPage.getHeight() - a4Height)).toBeLessThan(1);
	}

	const sheetWidth = a4Height;
	const sheetHeight = a4Width;
	const cellWidth = sheetWidth / 2;
	const imposed = await PDFDocument.create();
	const embedded = await imposed.embedPages(logical.getPages());
	const pagesPerSheet: number[] = [];
	const scales: number[] = [];

	for (let i = 0; i < embedded.length; i += 2) {
		const sheet = imposed.addPage([sheetWidth, sheetHeight]);
		let placed = 0;
		for (let slot = 0; slot < 2 && i + slot < embedded.length; slot += 1) {
			const prayerPage = embedded[i + slot];
			const scale = Math.min(cellWidth / prayerPage.width, sheetHeight / prayerPage.height);
			scales.push(scale);
			const width = prayerPage.width * scale;
			const height = prayerPage.height * scale;
			sheet.drawPage(prayerPage, {
				x: slot * cellWidth + (cellWidth - width) / 2,
				y: (sheetHeight - height) / 2,
				width,
				height
			});
			placed += 1;
		}
		pagesPerSheet.push(placed);
	}

	const imposedBytes = await imposed.save();
	const reopened = await PDFDocument.load(imposedBytes);
	expect(reopened.getPageCount()).toBe(Math.ceil(logical.getPageCount() / 2));
	expect(pagesPerSheet.slice(0, -1).every((count) => count === 2)).toBe(true);
	expect(pagesPerSheet.at(-1)).toBe(logical.getPageCount() % 2 || 2);
	expect(Math.min(...scales)).toBeGreaterThan(0.7);
	expect(Math.max(...scales)).toBeLessThan(0.71);
	expect(14.7 * Math.min(...scales), 'largest two-up prayer face stays above 10pt').toBeGreaterThan(
		10
	);
	for (const sheet of reopened.getPages()) {
		expect(sheet.getWidth()).toBeCloseTo(sheetWidth, 1);
		expect(sheet.getHeight()).toBeCloseTo(sheetHeight, 1);
	}
});

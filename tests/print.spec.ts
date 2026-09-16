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
	await page.goto('/app/pl/ordinarium/confiteor?w=w014');

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
	await expect(settings.locator('.picker[data-kind="role"] .option.on .real')).toHaveText('wierni');
	await expect(settings.locator('.picker[data-kind="mass"] .option.on .real')).toHaveText(
		'śpiewana'
	);
	for (const option of await settings.locator('.option:not(.on)').all()) {
		await expect(option).toBeHidden();
	}
	const metadataFont = await settings.locator('.picker[data-kind="role"]').evaluate((picker) => ({
		label: parseFloat(getComputedStyle(picker.querySelector('.label')!).fontSize),
		value: parseFloat(getComputedStyle(picker.querySelector('.option.on')!).fontSize)
	}));
	expect(metadataFont.label, 'print metadata label stays at 5.5pt').toBeCloseTo((5.5 * 4) / 3, 2);
	expect(metadataFont.value, 'print metadata value stays at 6.5pt').toBeCloseTo((6.5 * 4) / 3, 2);
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

test('print composes the Ordo day and settings as two stable metadata rows', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-role', 'populus');
		localStorage.setItem('scrutabor-mass-form', 'cantu');
	});
	await page.emulateMedia({ media: 'print' });
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-09-29');

	const settings = page.locator('.help-row');
	await expect(settings.locator('#day-value')).toHaveText(
		'Poświęcenie Bazyliki św. Michała Archanioła'
	);
	await expect(settings.locator('.choice-date')).toHaveText('29 września 2026');

	const geometry = await settings.evaluate((element) => {
		const box = (selector: string) => {
			const rect = element.querySelector(selector)!.getBoundingClientRect();
			return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
		};
		return {
			day: box('.day'),
			title: box('.choice-title'),
			date: box('.choice-date'),
			role: box('.picker[data-kind="role"]'),
			mass: box('.picker[data-kind="mass"]'),
			labelAlignment: ['role', 'mass'].map(
				(kind) =>
					getComputedStyle(element.querySelector(`.picker[data-kind="${kind}"] .label`)!).alignSelf
			)
		};
	});

	expect(geometry.day.bottom, 'the day occupies the complete first metadata row').toBeLessThan(
		geometry.role.top
	);
	expect(geometry.role.top, 'role and Mass begin on one second row').toBeCloseTo(
		geometry.mass.top,
		0
	);
	expect(geometry.role.right, 'the second-row pairs do not overlap').toBeLessThan(
		geometry.mass.left
	);
	expect(geometry.labelAlignment, 'print labels align to their values, not the row centre').toEqual(
		['baseline', 'baseline']
	);
	expect(geometry.title.top, 'the feast and date share one text line on A4').toBeCloseTo(
		geometry.date.top,
		0
	);

	for (const width of [500, 360]) {
		await page.setViewportSize({ width, height: 900 });
		const narrow = await settings.evaluate((element) => {
			const frame = element.getBoundingClientRect();
			const day = element.querySelector('.day')!.getBoundingClientRect();
			const role = element.querySelector('.picker[data-kind="role"]')!.getBoundingClientRect();
			const mass = element.querySelector('.picker[data-kind="mass"]')!.getBoundingClientRect();
			return { frame, day, roleTop: role.top, massTop: mass.top };
		});
		expect(narrow.day.left, `${width}px day stays inside the print frame`).toBeGreaterThanOrEqual(
			narrow.frame.left - 1
		);
		expect(narrow.day.right, `${width}px day stays inside the print frame`).toBeLessThanOrEqual(
			narrow.frame.right + 1
		);
		expect(narrow.roleTop, `${width}px role and Mass retain their common row`).toBeCloseTo(
			narrow.massTop,
			0
		);
	}
});

test('print lays out a complete formulary as one continuous Mass', async ({ page }) => {
	await page.emulateMedia({ media: 'print' });
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/formularium/dominica-i-adventus');

	await expect(page.locator('.proper-part')).toHaveCount(10);
	await expect(page.locator('.about-pill').first()).toBeHidden();
	const layout = await page
		.locator('.proper-part')
		.first()
		.evaluate((part) => ({
			partBreak: getComputedStyle(part).breakInside,
			headingBreak: getComputedStyle(part.querySelector('.part-heading')!).breakAfter,
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
		}));
	expect(layout.partBreak, 'a long Gospel may continue on the next sheet').toBe('auto');
	expect(layout.headingBreak, 'a part title stays with the text it names').toBe('avoid-page');
	expect(layout.overflow, 'the complete Mass fits the paper width').toBeLessThanOrEqual(1);
});

test('print preserves manually opened repeated prayers and leaves the others folded', async ({
	page
}) => {
	await page.goto('/app/pl/orationes/angelus-domini');

	const repetitions = page.locator('.verse.repeated');
	await expect(repetitions).toHaveCount(3);
	await repetitions.first().locator('.repeated-toggle').click();
	await expect(repetitions.first().locator('.repeated-toggle')).toHaveAttribute(
		'aria-expanded',
		'true'
	);

	await page.emulateMedia({ media: 'print' });
	for (const toggle of await repetitions.locator('.repeated-toggle').all()) {
		await expect(toggle).toHaveCSS('opacity', '0');
	}
	const alignment = await repetitions.first().evaluate((verse) => ({
		repeated: verse.querySelector<HTMLElement>('.base')!.getBoundingClientRect().left,
		neighbor: verse
			.previousElementSibling!.querySelector<HTMLElement>('.base')!
			.getBoundingClientRect().left
	}));
	expect(alignment.repeated).toBeCloseTo(alignment.neighbor, 0);
	await expect(repetitions.nth(0).locator('.token')).toHaveCount(31);
	await expect(repetitions.nth(1).locator('.token')).toHaveCount(4);
	await expect(repetitions.nth(2).locator('.token')).toHaveCount(4);
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

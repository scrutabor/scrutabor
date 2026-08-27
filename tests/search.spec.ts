import type { Page } from '@playwright/test';
import { atRoute, expect, setHelp, settled, test } from './fixtures';

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
	await expect(page.locator('#s01.segment-selected')).toBeVisible();
});

const clickVerseSurface = async (page: Page, id: string) => {
	const verse = page.locator(`#${id}`);
	await verse.scrollIntoViewIfNeeded();
	const box = await verse.boundingBox();
	expect(box, `${id} has a clickable surface`).not.toBeNull();
	await page.mouse.click(box!.x + box!.width - 4, box!.y + box!.height / 2);
};

test('verse surfaces create, extend, share, and clear a selection', async ({ page }) => {
	await page.goto('/app/pl/orationes/angelus-domini');
	await page.evaluate(() => {
		const state = window as typeof window & { selectionChildMutations?: number };
		state.selectionChildMutations = 0;
		new MutationObserver((records) => {
			state.selectionChildMutations! += records.filter(
				(record) => record.type === 'childList'
			).length;
		}).observe(document.querySelector('main')!, { childList: true, subtree: true });
	});
	await clickVerseSurface(page, 's10');
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?s=s10'));
	await expect(page.locator('#s10.segment-selected')).toBeVisible();

	// Shift gives the range gesture precedence even on a word: it must not
	// open the analysis panel or add a redundant ?w= to the citation.
	await page.locator('#w131').click({ modifiers: ['Shift'] });
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?s=s10-s12'));
	await expect(page.locator('.segment-selected')).toHaveCount(3);
	await expect(page.locator('aside')).toHaveCount(0);
	expect(
		await page.evaluate(
			() => (window as typeof window & { selectionChildMutations?: number }).selectionChildMutations
		),
		'selection added or removed rendered content'
	).toBe(0);

	await page.reload();
	await expect(page.locator('.segment-selected')).toHaveCount(3);
	await clickVerseSurface(page, 's11');
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?s=s11'));
	await expect(page.locator('.segment-selected')).toHaveCount(1);
	await expect(page.locator('#s11.segment-selected')).toBeVisible();

	await clickVerseSurface(page, 's11');
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini'));
	await expect(page.locator('.segment-selected')).toHaveCount(0);
});

test('a word remains distinct from an explicitly selected verse', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto('/app/pl/orationes/angelus-domini');
	await page.locator('#w008').click();

	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?w=w008'));
	await expect(page.locator('#s02')).not.toHaveClass(/segment-selected/);
	const wash = await page
		.locator('#s02')
		.evaluate((verse) => getComputedStyle(verse, '::before').backgroundColor);
	expect(wash, 'a word selection paints an implicit verse wash').toBe('rgba(0, 0, 0, 0)');
	await expect(page.locator('#w008')).toHaveClass(/selected/);

	await page.locator('#w009').click();
	await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?w=w009'));
	await expect(page.locator('#w009')).toHaveClass(/selected/);
});

test('the line control fills the row but leaves no idle grip', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto('/app/pl/orationes/angelus-domini');
	await expect(page.locator('.segment-handle-ink')).toHaveCount(0);

	const control = await page.locator('#s02 .segment-control').evaluate((button) => {
		const own = button.getBoundingClientRect();
		const verse = button.closest('.verse')!.getBoundingClientRect();
		const style = getComputedStyle(button);
		return {
			widthShare: own.width / verse.width,
			height: own.height,
			background: style.backgroundColor,
			border: style.borderTopWidth
		};
	});
	expect(control.widthShare, 'the row, not a narrow gutter, is the target').toBeGreaterThan(0.95);
	expect(control.height, 'the target has the full line height').toBeGreaterThan(40);
	expect(control.background, 'the idle control paints a mobile artefact').toBe('rgba(0, 0, 0, 0)');
	expect(control.border).toBe('0px');
});

test('selecting a verse changes only paint and clears neighbouring glosses', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	const geometry = async () =>
		page.locator('#s11, #s12, #s13').evaluateAll((elements) =>
			elements.map((element) => {
				const rect = element.getBoundingClientRect();
				return {
					x: rect.x,
					y: rect.y + scrollY,
					width: rect.width,
					height: rect.height
				};
			})
		);
	await page.goto('/app/pl/orationes/angelus-domini');
	const before = await geometry();
	await page.goto('/app/pl/orationes/angelus-domini?s=s12');
	const after = await geometry();
	expect(after, 'selection changed verse geometry').toEqual(before);

	await page.goto('/app/pl/orationes/angelus-domini?s=s13');
	const long = await page.locator('#s13.segment-selected').evaluate((element) => {
		const verse = element.getBoundingClientRect();
		const wash = getComputedStyle(element, '::before');
		const preceding = document.querySelectorAll('#s12 rt');
		const own = element.querySelectorAll('rt');
		return {
			topAir:
				verse.top +
				parseFloat(wash.top) -
				Math.max(...[...preceding].map((gloss) => gloss.getBoundingClientRect().bottom)),
			bottomAir:
				verse.bottom -
				parseFloat(wash.bottom) -
				Math.max(...[...own].map((gloss) => gloss.getBoundingClientRect().bottom)),
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
		};
	});
	expect(long.topAir, 'the wash reaches the preceding interlinear gloss').toBeGreaterThan(2);
	expect(long.bottomAir, 'the wash cuts through its interlinear gloss').toBeGreaterThan(4);
	expect(long.overflow, 'the selected verse widens the page').toBe(0);

	await page.goto('/app/pl/orationes/angelus-domini?s=s07');
	const edge = await page.locator('#s07.segment-selected').evaluate((element) => {
		const verse = element.getBoundingClientRect();
		const wash = getComputedStyle(element, '::before');
		const paint = {
			left: verse.left + Number.parseFloat(wash.left),
			top: verse.top + Number.parseFloat(wash.top),
			bottom: verse.bottom - Number.parseFloat(wash.bottom)
		};
		const control = element.querySelector('.segment-control')!.getBoundingClientRect();
		const mark = element.querySelector('.mark')!.getBoundingClientRect();
		return {
			leftAttachment: Math.abs(control.left - paint.left),
			topAttachment: Math.abs(control.top - paint.top),
			bottomAttachment: Math.abs(control.bottom - paint.bottom),
			markAir: mark.left - paint.left
		};
	});
	expect(edge.leftAttachment, 'the row control starts away from the wash').toBeLessThan(0.6);
	expect(edge.topAttachment, 'the row control starts inside the selected line').toBeLessThan(0.6);
	expect(edge.bottomAttachment, 'the row control stops inside the selected line').toBeLessThan(0.6);
	expect(edge.markAir, 'the selected background crowds the V. mark').toBeGreaterThan(8);
});

test('a selected word and its selected line share exact vertical edges', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	for (const [kind, url] of [
		['ordinary word', '/app/pl/orationes/angelus-domini?s=s01&w=w002'],
		['raised initial', '/app/pl/orationes/pater-noster?s=s01&w=w001']
	] as const) {
		for (const level of [0, 1, 2] as const) {
			await page.goto(url);
			await setHelp(page, level);
			const edges = await page.evaluate(() => {
				const line = document.querySelector('.verse.segment-selected')!;
				const word = document.querySelector('.token.word-selected')!;
				const painted = (element: Element) => {
					const rect = element.getBoundingClientRect();
					const style = getComputedStyle(element, '::before');
					return {
						top: rect.top + parseFloat(style.top),
						bottom: rect.bottom - parseFloat(style.bottom),
						background: style.backgroundColor
					};
				};
				return { line: painted(line), word: painted(word) };
			});
			expect(edges.line.background, `${kind}, mode ${level}: line wash`).not.toBe(
				'rgba(0, 0, 0, 0)'
			);
			expect(edges.word.background, `${kind}, mode ${level}: word wash`).not.toBe(
				'rgba(0, 0, 0, 0)'
			);
			expect(
				Math.abs(edges.line.top - edges.word.top),
				`${kind}, mode ${level}: top edges`
			).toBeLessThan(0.6);
			expect(
				Math.abs(edges.line.bottom - edges.word.bottom),
				`${kind}, mode ${level}: bottom edges`
			).toBeLessThan(0.6);
		}
	}
});

test('a selected range has one uniform opaque wash without seams', async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 800 });
	await page.goto('/app/pl/orationes/pater-noster?s=s03-s06');
	const layers = await page.locator('#s03, #s04, #s05, #s06').evaluateAll((elements) => {
		const alpha = (colour: string) => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const context = canvas.getContext('2d')!;
			context.fillStyle = colour;
			context.fillRect(0, 0, 1, 1);
			return context.getImageData(0, 0, 1, 1).data[3];
		};
		return elements.map((element) => {
			const rect = element.getBoundingClientRect();
			const own = getComputedStyle(element).backgroundColor;
			const wash = getComputedStyle(element, '::before');
			return {
				ownAlpha: alpha(own),
				washAlpha: alpha(wash.backgroundColor),
				washColour: wash.backgroundColor,
				topLeftRadius: parseFloat(wash.borderTopLeftRadius),
				topRightRadius: parseFloat(wash.borderTopRightRadius),
				bottomLeftRadius: parseFloat(wash.borderBottomLeftRadius),
				bottomRightRadius: parseFloat(wash.borderBottomRightRadius),
				paintTop: rect.top + parseFloat(wash.top),
				paintBottom: rect.bottom - parseFloat(wash.bottom)
			};
		});
	});

	expect(
		layers.every(({ ownAlpha }) => ownAlpha === 0),
		'the verse adds a second wash'
	).toBe(true);
	expect(
		layers.every(({ washAlpha }) => washAlpha === 255),
		'the range wash is translucent'
	).toBe(true);
	expect(new Set(layers.map(({ washColour }) => washColour)).size).toBe(1);
	expect(layers[0].topLeftRadius).toBeGreaterThan(0);
	expect(layers[0].topRightRadius).toBeGreaterThan(0);
	expect(layers[0].bottomLeftRadius).toBe(0);
	expect(layers[0].bottomRightRadius).toBe(0);
	for (const middle of layers.slice(1, -1)) {
		expect([
			middle.topLeftRadius,
			middle.topRightRadius,
			middle.bottomLeftRadius,
			middle.bottomRightRadius
		]).toEqual([0, 0, 0, 0]);
	}
	expect(layers.at(-1)!.topLeftRadius).toBe(0);
	expect(layers.at(-1)!.topRightRadius).toBe(0);
	expect(layers.at(-1)!.bottomLeftRadius).toBeGreaterThan(0);
	expect(layers.at(-1)!.bottomRightRadius).toBeGreaterThan(0);
	for (let index = 1; index < layers.length; index += 1) {
		expect(
			layers[index - 1].paintBottom,
			`paint gap between selected lines ${index} and ${index + 1}`
		).toBeGreaterThanOrEqual(layers[index].paintTop);
	}
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

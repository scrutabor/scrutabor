import { bare, expect } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

const subjects = [
	'/app/pl/formularium/dominica-i-adventus',
	'/app/en/formularium/commemoratio-omnium-fidelium-defunctorum',
	'/app/en/formularium/dominica-i-passionis'
];

bare('glyph geometry rejects unavailable font metrics @online', async ({ page }) => {
	await page.goto('/app/en/ordinarium/corpus-tuum');
	await page.evaluate(() => document.fonts.ready);
	await page.evaluate(() => {
		const measure = CanvasRenderingContext2D.prototype.measureText;
		CanvasRenderingContext2D.prototype.measureText = function (text) {
			const metrics = measure.call(this, text);
			Object.defineProperty(metrics, 'fontBoundingBoxAscent', { value: NaN });
			return metrics;
		};
	});
	await expect(page.locator('main').evaluate(interlinearGeometry)).rejects.toThrow(
		'Unmeasurable interlinear ink'
	);
});

bare('glyph geometry detects needless word fragmentation @online', async ({ page }) => {
	await page.goto('/app/en/ordinarium/corpus-tuum');
	await page.evaluate(() => document.fonts.ready);
	const unit = page.locator('.verse.glossed > .token:not(:has(.initial))').first();
	const [before] = await unit.evaluate(interlinearGeometry);
	expect(before.sourceInk.rows).toBe(1);
	expect(before.captionInk.rows).toBe(1);
	for (const [selector, ink, width] of [
		['.base', 'sourceInk', 'sourceUnwrappedWidth'],
		['.caption-content', 'captionInk', 'captionUnwrappedWidth']
	] as const) {
		const text = unit.locator(selector);
		const originalStyle = await text.getAttribute('style');
		await text.evaluate((element) => {
			const style = (element as HTMLElement).style;
			style.setProperty('display', 'inline-block', 'important');
			style.setProperty('inline-size', '1px', 'important');
			style.setProperty('overflow-wrap', 'anywhere', 'important');
		});
		const [fragmented] = await unit.evaluate(interlinearGeometry);
		expect(fragmented[width]).toBeLessThan(fragmented.availableWidth);
		expect(
			fragmented[ink].rows,
			`${selector} is incorrectly split despite fitting`
		).toBeGreaterThan(1);
		await text.evaluate((element, value) => {
			if (value === null) element.removeAttribute('style');
			else element.setAttribute('style', value);
		}, originalStyle);
		expect(await unit.evaluate(interlinearGeometry)).toEqual([before]);
	}
});

bare('baseline geometry detects extra space between verses @online', async ({ page }) => {
	await page.goto('/app/en/ordinarium/corpus-tuum');
	await page.evaluate(() => document.fonts.ready);
	const before = await page.locator('main').evaluate(interlinearGeometry);
	const firstVerse = before[0].verseId;
	const second = page.locator('.verse.glossed').nth(1);
	const originalStyle = await second.getAttribute('style');
	await second.evaluate((element) => ((element as HTMLElement).style.marginTop = '30px'));
	const after = await page.locator('main').evaluate(interlinearGeometry);
	expect(after.filter((unit) => unit.verseId === firstVerse)).toEqual(
		before.filter((unit) => unit.verseId === firstVerse)
	);
	const baselineBefore = before.find((unit) => unit.verseId !== firstVerse)!.sourceInk.baselines[0];
	const baselineAfter = after.find((unit) => unit.verseId !== firstVerse)!.sourceInk.baselines[0];
	expect(
		baselineAfter - baselineBefore,
		'the added gap must not disappear in glyph metrics'
	).toBeCloseTo(30, 1);
	await second.evaluate((element, value) => {
		if (value === null) element.removeAttribute('style');
		else element.setAttribute('style', value);
	}, originalStyle);
	expect(await page.locator('main').evaluate(interlinearGeometry)).toEqual(before);
});

bare('baseline geometry detects a displaced speaker mark @online', async ({ page }) => {
	await page.goto('/app/en/ordinarium/corpus-tuum');
	await page.evaluate(() => document.fonts.ready);
	const before = await page.locator('main').evaluate(interlinearGeometry);
	const first = before.find((unit) => unit.markerBaselineDelta !== null)!;
	expect(first, 'a speaker mark must be measured').toBeDefined();
	const mark = page.locator('.verse.glossed > .mark').first();
	const originalStyle = await mark.getAttribute('style');
	await mark.evaluate((element) => ((element as HTMLElement).style.transform = 'translateY(10px)'));
	const after = await page.locator('main').evaluate(interlinearGeometry);
	const displaced = after.find((unit) => unit.markerBaselineDelta !== null)!;
	expect(displaced.markerBaselineDelta! - first.markerBaselineDelta!).toBeCloseTo(10, 1);
	await mark.evaluate((element, value) => {
		if (value === null) element.removeAttribute('style');
		else element.setAttribute('style', value);
	}, originalStyle);
	expect(await page.locator('main').evaluate(interlinearGeometry)).toEqual(before);
});

for (const host of ['@online', '@online @static-host']) {
	for (const route of subjects) {
		bare(
			`interlinear pairs remain readable without application scripts: ${route} ${host}`,
			async ({ page }, testInfo) => {
				await page.route('**/_app/immutable/**/*.js', (request) => request.abort());
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				// Set the stored theme on an initial same-origin page, then each
				// navigation exercises the actual prepaint settings script.
				await page.goto(route);
				for (const theme of ['light', 'dark']) {
					await page.evaluate((value) => localStorage.setItem('scrutabor-theme', value), theme);
					for (const width of [320, 390, 1280]) {
						await page.setViewportSize({ width, height: 900 });
						await page.goto(route);
						await expect(page.locator('main')).toBeVisible();
						await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
						await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
						await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
						await page.evaluate(() => document.fonts.ready);
						const geometry = await page.locator('main').evaluate(interlinearGeometry);
						const damage = geometry.filter(
							(unit) =>
								unit.clearance < 0 ||
								[unit.sourceInk, unit.captionInk].some(
									(ink) => !ink.count || ink.left < -0.5 || ink.right > width + 0.5
								)
						);
						const context = `${route}, ${width}px, ${theme}`;
						expect(geometry.length, context).toBeGreaterThan(0);
						expect(
							await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
							context
						).toBe(0);
						expect(damage, context).toEqual([]);
						if (width === 320 && theme === 'dark') {
							const group = page.locator('.verse.glossed > .token-group').first();
							await group.locator(':scope > button').hover();
							const [selected] = await group.evaluate(interlinearGeometry);
							expect(selected.paint).not.toBeNull();
							expect(selected.paint!.top).toBeLessThanOrEqual(
								Math.min(selected.sourceInk.top, selected.captionInk.top)
							);
							expect(selected.paint!.bottom).toBeGreaterThanOrEqual(
								Math.max(selected.sourceInk.bottom, selected.captionInk.bottom)
							);
							await page.screenshot({ path: testInfo.outputPath('static-320-dark.png') });
						}
					}
				}
			}
		);
	}
}

bare(
	'glyph geometry detects a displaced caption and an incomplete highlight @online',
	async ({ page }) => {
		await page.goto('/app/en/ordinarium/corpus-tuum');
		await page.evaluate(() => document.fonts.ready);
		const group = page.locator('.token-group', { hasText: 'non remáneat' });
		await group.locator(':scope > button').hover();
		const [before] = await group.evaluate(interlinearGeometry);
		expect(before.sourceInk.count).toBeGreaterThan(0);
		expect(before.captionInk.count).toBeGreaterThan(0);
		expect(before.clearance).toBeGreaterThan(0);
		expect(before.paint!.bottom).toBeGreaterThan(before.captionInk.bottom);
		const caption = group.locator('.caption-content');
		const originalStyle = await caption.getAttribute('style');
		await caption.evaluate((element) => {
			(element as HTMLElement).style.transform = 'translateY(-10em)';
		});
		const [collision] = await group.evaluate(interlinearGeometry);
		expect(collision.clearance, 'the measurement catches actual displaced ink').toBeLessThan(0);
		await caption.evaluate((element, value) => {
			if (value === null) element.removeAttribute('style');
			else element.setAttribute('style', value);
		}, originalStyle);
		await group.evaluate((element) => element.setAttribute('data-ink-control', ''));
		const style = await page.addStyleTag({
			content:
				'[data-ink-control]::before { inset-block-end: calc(var(--reading) * .284) !important }'
		});
		const [cut] = await group.evaluate(interlinearGeometry);
		expect(cut.paint!.bottom, 'the former inset leaves caption ink outside').toBeLessThan(
			cut.captionInk.bottom
		);
		await style.evaluate((element) => element.parentNode?.removeChild(element));
		await group.evaluate((element) => element.removeAttribute('data-ink-control'));
		expect(await group.evaluate(interlinearGeometry)).toEqual([before]);
	}
);

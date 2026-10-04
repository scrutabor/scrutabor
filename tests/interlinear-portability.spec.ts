import { bare, expect } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

// Native annotation and selection behavior differ between browser engines.
// Exercise the static document, not a layout repaired after scripts arrive.
bare.use({ serviceWorkers: 'block' });

for (const route of [
	'/app/en/ordinarium/quod-ore-sumpsimus',
	'/app/en/ordinarium/corpus-tuum',
	'/app/en/formularium/dominica-i-passionis',
	'/app/en/formularium/commemoratio-omnium-fidelium-defunctorum',
	'/app/pl/formularium/dominica-i-adventus',
	'/app/pl/psalmi/118-he'
]) {
	bare(
		`static interlinear geometry and Latin copying: ${route} @online @reader`,
		async ({ page }) => {
			await page.route('**/_app/immutable/**/*.js', (request) => request.abort());
			await page.goto(route);
			for (const size of ['normal', 'largest']) {
				await page.evaluate((value) => localStorage.setItem('scrutabor-reading', value), size);
				for (const width of [320, 1280]) {
					await page.setViewportSize({ width, height: 900 });
					await page.goto(route);
					await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
					await expect(page.locator('html')).toHaveAttribute('data-reading', size);
					await page.evaluate(() => document.fonts.ready);
					const geometry = await page.locator('main').evaluate(interlinearGeometry);
					const context = `${route}, ${width}px, ${size}`;
					expect(geometry.length, context).toBeGreaterThan(0);
					expect(
						geometry.filter(
							(unit) =>
								unit.clearance < 0 ||
								(unit.markerBaselineDelta !== null && Math.abs(unit.markerBaselineDelta) > 1) ||
								(!unit.initial &&
									unit.sourceUnwrappedWidth < unit.availableWidth - 2 &&
									unit.sourceInk.rows > 1) ||
								(unit.captionUnwrappedWidth < unit.availableWidth - 2 &&
									unit.captionInk.rows > 1) ||
								[unit.sourceInk, unit.captionInk].some(
									(ink) => ink.left < -0.5 || ink.right > width + 0.5
								)
						),
						context
					).toEqual([]);
					for (let index = 1; index < geometry.length; index += 1) {
						const left = geometry[index - 1];
						const right = geometry[index];
						if (
							left.verseId === right.verseId &&
							right.bounds.left >= left.bounds.right - 1 &&
							Math.min(left.bounds.bottom, right.bounds.bottom) >
								Math.max(left.bounds.top, right.bounds.top)
						) {
							expect(
								Math.abs(right.sourceInk.baselines[0] - left.sourceInk.baselines[0]),
								`${context}: adjacent Latin baselines: ${left.text} / ${right.text}`
							).toBeLessThanOrEqual(1);
						}
					}
					const copies = await page.locator('.verse.glossed').evaluateAll((verses) =>
						verses.map((verse) => {
							const sources = [...verse.querySelectorAll('.base')];
							if (!sources.length) throw new Error('No Latin source in verse');
							const range = document.createRange();
							range.setStart(sources[0], 0);
							const last = sources.at(-1)!;
							range.setEnd(last, last.childNodes.length);
							const selection = getSelection()!;
							selection.removeAllRanges();
							selection.addRange(range);
							const actual = selection.toString();
							selection.removeAllRanges();
							return { actual, expected: sources.map((source) => source.textContent).join(' ') };
						})
					);
					expect(copies.length, context).toBeGreaterThan(0);
					for (const { actual, expected } of copies) {
						expect(actual, context).not.toMatch(/[\r\n]/);
						expect(actual.replace(/\s+/g, ' ').trim(), context).toBe(
							expected.replace(/\s+/g, ' ').trim()
						);
					}
				}
			}
		}
	);
}

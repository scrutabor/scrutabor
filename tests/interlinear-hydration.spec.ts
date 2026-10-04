import type { Page } from '@playwright/test';
import { bare, expect } from './fixtures';

// A previous iteration must not serve scripts from its newly installed worker
// while the next iteration deliberately holds the application network requests.
bare.use({ serviceWorkers: 'block' });

async function readingGeometry(page: Page) {
	return page.locator('.verse.glossed').evaluateAll((verses) =>
		verses.flatMap((verse) =>
			[...verse.querySelectorAll(':scope > .token, :scope > .token-group')]
				.filter((unit) => unit.querySelector('rt'))
				.map((unit) => {
					const source = unit.querySelector('.shared-base') ?? unit.querySelector('.base')!;
					const caption = unit.querySelector('rt')!;
					return {
						text: unit.textContent,
						boxes: [unit, source, caption].flatMap((element) => {
							const box = element.getBoundingClientRect();
							return [box.x, box.y + scrollY, box.width, box.height];
						})
					};
				})
		)
	);
}

async function afterPaint(page: Page) {
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	);
}

const subjects = [
	'/app/pl/ordinarium/gloria',
	'/app/pl/formularium/dominica-i-adventus',
	'/app/en/formularium/commemoratio-omnium-fidelium-defunctorum',
	'/app/en/formularium/dominica-i-passionis'
];

for (const host of ['@online', '@online @static-host']) {
	for (const route of subjects) {
		bare(
			`interlinear text does not move when interaction loads: ${route} ${host}`,
			async ({ page }) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				for (const width of [320, 1280]) {
					await page.setViewportSize({ width, height: 900 });
					let release!: () => void;
					const scripts = new Promise<void>((resolve) => (release = resolve));
					const scriptPattern = '**/_app/immutable/**/*.js';
					await page.route(scriptPattern, async (request) => {
						await scripts;
						await request.continue();
					});
					try {
						await page.goto(route, { waitUntil: 'domcontentloaded' });
						await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
						await page.evaluate(() => document.fonts.ready);
						// A reader can already be partway down the static text before
						// the application arrives. First-viewport metrics miss this case.
						const verses = page.locator('.verse.glossed');
						const count = await verses.count();
						expect(count).toBeGreaterThan(0);
						await verses
							.nth(Math.floor(count / 2))
							.evaluate((verse) => verse.scrollIntoView({ block: 'start', behavior: 'instant' }));
						await page.mouse.wheel(0, 64);
						await afterPaint(page);
						const before = await readingGeometry(page);
						expect(before.length).toBeGreaterThan(0);
						release();
						await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
						await afterPaint(page);
						const after = await readingGeometry(page);
						expect(after.map((unit) => unit.text)).toEqual(before.map((unit) => unit.text));
						const moved = before.flatMap((unit, index) => {
							const delta = Math.max(
								...unit.boxes.map((value, coordinate) =>
									Math.abs(value - after[index].boxes[coordinate])
								)
							);
							return delta > 0.5 ? [{ text: unit.text, delta }] : [];
						});
						expect(moved, `${route} at ${width}px changed its reading geometry`).toEqual([]);
					} finally {
						release();
						await page.unroute(scriptPattern);
					}
				}
			}
		);
	}
}

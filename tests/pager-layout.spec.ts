import { expect, setTheme, test } from './fixtures';

for (const lang of ['pl', 'en'] as const) {
	for (const size of ['normal', 'largest']) {
		for (const theme of ['light', 'dark'] as const) {
			test(`@reader ${lang} ${size} ${theme} pager preserves whole words at 320px`, async ({
				page
			}) => {
				await page.addInitScript((size) => localStorage.setItem('scrutabor-reading', size), size);
				await page.setViewportSize({ width: 320, height: 900 });
				await page.goto(`/app/${lang}/formularium/dominica-ii-post-pascha`);
				await setTheme(page, theme);
				const pager = page.locator('nav.pager');
				await pager.scrollIntoViewIfNeeded();
				const links = pager.locator('a');
				await expect(links).toHaveCount(2);
				for (const title of await links.locator('span[lang]').all()) {
					await expect(title).toHaveAttribute('lang', lang);
					const words = await title.evaluate((span) => {
						const node = span.firstChild!;
						return [...node.textContent!.matchAll(/\p{L}+/gu)].map((match) => {
							const range = document.createRange();
							range.setStart(node, match.index!);
							range.setEnd(node, match.index! + match[0].length);
							return {
								word: match[0],
								lines: new Set([...range.getClientRects()].map((r) => Math.round(r.y))).size
							};
						});
					});
					expect(words.length).toBeGreaterThan(0);
					for (const word of words) expect(word.lines, word.word).toBe(1);
				}
				const boxes = await links.evaluateAll((anchors) =>
					anchors.map((a) => {
						const r = a.getBoundingClientRect();
						return {
							x: r.x,
							right: r.right,
							width: r.width,
							height: r.height,
							overflow: a.scrollWidth > a.clientWidth + 1
						};
					})
				);
				expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1);
				expect(boxes[1].x - boxes[0].right).toBeGreaterThanOrEqual(16);
				for (const box of boxes) {
					expect(box.height).toBeGreaterThanOrEqual(24);
					expect(box.overflow).toBe(false);
				}
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
				).toBe(false);
				await links.first().click();
				await expect(page).toHaveURL(/\/formularium\/dominica-in-albis(?:[?#]|$)/);
			});
		}
	}

	test(`@reader ${lang} single-ended and Latin pager titles retain their identity`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.setViewportSize({ width: 320, height: 900 });
		await page.goto(`/app/${lang}/orationes/pater-noster`);
		const pager = page.locator('nav.pager');
		await expect(pager.locator('a')).toHaveCount(1);
		await expect(pager.locator('a')).toHaveClass(/pager-next/);
		await expect(pager.locator('span[lang]')).toHaveAttribute('lang', 'la');
		await expect(pager.locator('a')).toHaveCSS('text-align', 'right');
		await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-04-19`);
		await expect(pager.locator('a')).toHaveCount(1);
		await expect(pager.locator('a')).not.toHaveClass(/pager-next/);
		await expect(pager.locator('span[lang]')).toHaveAttribute('lang', 'la');
		await expect(pager.locator('a')).toHaveCSS('text-align', 'start');
	});
}

test('@reader a genuinely unbreakable title still fits without clipping', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto('/app/en/ordinarium/gloria');
	const pager = page.locator('nav.pager');
	await expect(pager.locator('a')).toHaveCount(2);
	await pager
		.locator('span[lang]')
		.first()
		.evaluate((span) => {
			span.textContent = 'Supercalifragilisticexpialidocious';
		});
	const state = await pager
		.locator('a')
		.first()
		.evaluate((a) => ({
			overflow: a.scrollWidth > a.clientWidth + 1,
			wrap: getComputedStyle(a).overflowWrap
		}));
	expect(state.overflow).toBe(false);
	expect(state.wrap).toBe('anywhere');
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
		false
	);
});

// The reading size: three steps, set once, kept.
import { expect, test } from './fixtures';

const size = (page: import('@playwright/test').Page) =>
	page.evaluate(() => ({
		reading: getComputedStyle(document.documentElement).getPropertyValue('--reading').trim(),
		latin: parseFloat(getComputedStyle(document.querySelector('.verse')!).fontSize),
		gloss: parseFloat(getComputedStyle(document.querySelector('.verse rt')!).fontSize),
		mark: parseFloat(getComputedStyle(document.querySelector('.mark')!).fontSize)
	}));

test('three steps, and back to where it started', async ({ page }) => {
	await page.goto('/en/ordinarium/confiteor');
	const btn = page.getByRole('button', { name: /text size/i });

	const seen: number[] = [];
	for (let i = 0; i < 4; i++) {
		seen.push((await size(page)).latin);
		await btn.click();
	}
	// three distinct steps, ascending, then round to the first again
	expect(seen[1]).toBeGreaterThan(seen[0]);
	expect(seen[2]).toBeGreaterThan(seen[1]);
	expect(seen[3], 'the fourth press comes back to the first step').toBe(seen[0]);
});

test('the apparatus grows with the face, not after it', async ({ page }) => {
	// The whole reason the size had to become one knob: five sizes and the
	// entire vertical rhythm used to be absolute, so the Latin would have
	// grown and the glosses, marks and rubrics stayed where they were.
	await page.goto('/en/ordinarium/confiteor');
	const btn = page.getByRole('button', { name: /text size/i });
	const small = await size(page);
	await btn.click();
	await btn.click();
	const large = await size(page);

	expect(large.latin, 'the reading face followed').toBeGreaterThan(small.latin * 1.3);
	for (const part of ['gloss', 'mark'] as const) {
		const before = small[part] / small.latin;
		const after = large[part] / large.latin;
		expect(Math.abs(after - before), `the ${part} kept its proportion`).toBeLessThan(0.02);
	}
});

test('the choice survives the page, the navigation and the reload', async ({ page }) => {
	await page.goto('/en/ordinarium/confiteor');
	const btn = page.getByRole('button', { name: /text size/i });
	await btn.click();
	const chosen = (await size(page)).reading;
	expect(chosen).not.toBe('1.45rem');

	await page.goto('/en/ordinarium/credo');
	expect((await size(page)).reading, 'kept across a navigation').toBe(chosen);

	await page.reload();
	await page.waitForSelector('html[data-hydrated]');
	expect((await size(page)).reading, 'kept across a reload').toBe(chosen);
});

test('a reader who asked for large print never sees the page start small', async ({ page }) => {
	// app.html resolves the stored size in <head>, before anything is
	// drawn — the same treatment the theme gets. If it were left to the
	// component's onMount the page would paint at the default size first.
	await page.goto('/en/ordinarium/confiteor');
	await page.getByRole('button', { name: /text size/i }).click();
	await page.getByRole('button', { name: /text size/i }).click();

	await page.goto('/en/ordinarium/credo');
	const beforeHydration = await page.evaluate(() => {
		// the inline script has run; hydration has not necessarily
		return {
			set: getComputedStyle(document.documentElement).getPropertyValue('--reading').trim(),
			hydrated: document.documentElement.hasAttribute('data-hydrated')
		};
	});
	expect(beforeHydration.set, 'the size is on the document from the <head> script').toBe('2.05rem');
});

test('the control is wherever the reader is', async ({ page }) => {
	// It is a setting, so it lives with the theme and the language rather
	// than on the reading surfaces (decisions #20) — which means it has to
	// be on the landing too, or it could only be changed while reading.
	for (const url of ['/en', '/en/ordinarium/credo', '/en/ordo/canon', '/en/grammatica']) {
		await page.goto(url);
		await expect(
			page.getByRole('button', { name: /text size/i }),
			`no way to set the size on ${url}`
		).toBeVisible();
	}
});

test('largest print on the smallest phone still holds together', async ({ page }) => {
	// The case the whole setting exists for, and the one most likely to
	// break: the biggest face in the narrowest column. A token that
	// fragments orphans its punctuation onto the next line; a gloss that
	// breaks reads as two glosses of two different words.
	await page.setViewportSize({ width: 320, height: 800 });
	for (const url of ['/pl/ordinarium/credo', '/en/ordo/canon', '/pl/orationes/pater-noster']) {
		await page.goto(url);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await page.waitForSelector('html[data-hydrated]');
		const damage = await page.evaluate(() => ({
			reading: getComputedStyle(document.documentElement).getPropertyValue('--reading').trim(),
			splitTokens: [...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.textContent?.trim()),
			brokenGlosses: [...document.querySelectorAll('.verse.glossed rt')]
				.filter((r) => r.getClientRects().length > 1)
				.map((r) => r.textContent?.trim()),
			overflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth
		}));
		expect(damage.reading, `${url}: the size did not take`).toBe('2.05rem');
		expect(damage.splitTokens, `${url}: a token fragmented`).toEqual([]);
		expect(damage.brokenGlosses, `${url}: a gloss broke across lines`).toEqual([]);
		expect(damage.overflowing, `${url}: the page scrolls sideways`).toBe(false);
	}
});

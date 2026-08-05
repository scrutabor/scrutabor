// The installable, offline shell: a missal has to open in a basement
// chapel with no signal.
import { expect, test } from '@playwright/test';

test('the whole book is readable offline after one visit', async ({ page, context }) => {
	await page.goto('/en');
	// ready resolves once the worker is active — install (and with it the
	// precache of every page) has finished by then.
	await page.evaluate(() => navigator.serviceWorker.ready);
	// The worker deliberately does not claim open pages, so control
	// arrives on the next navigation — as it would for a real reader.
	await page.reload();
	await page.waitForFunction(() => !!navigator.serviceWorker.controller);

	await context.setOffline(true);

	// a text never opened in this session, reached by URL
	await page.goto('/en/ordinarium/credo');
	await expect(page.locator('h1')).toHaveText('Credo');
	await expect(page.locator('rt').first()).toBeVisible();

	// the word panel needs no network either
	await page.locator('#w001').click();
	await expect(page.locator('aside .form')).toHaveText('Credo');
	await expect(page.locator('aside .meta')).toContainText('editorial');

	// and so does paging through the book (Credo closes the ordinarium,
	// so its pager offers the previous text)
	await page.locator('.pager a').first().click();
	await expect(page.locator('h1')).toHaveText('Glória in excélsis');

	await context.setOffline(false);
});

test('the pew core is offline; the dictionary follows the reader', async ({ page, context }) => {
	await page.goto('/en');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await page.waitForFunction(() => !!navigator.serviceWorker.controller);

	// a lemma page the reader HAS opened is kept…
	await page.goto('/en/lemma/mater');
	await expect(page.locator('h1')).toHaveText('mater');

	await context.setOffline(true);

	await page.goto('/en/lemma/mater');
	await expect(page.locator('h1')).toHaveText('mater');
	// …one they never opened is not precached: the install cost tracks the
	// prayers, not the lexicon
	const unvisited = await page.evaluate(async () => {
		const cache = await caches.open((await caches.keys())[0]);
		return !!(await cache.match('/en/lemma/panis', { ignoreSearch: true }));
	});
	expect(unvisited).toBe(false);

	await context.setOffline(false);
});

test('the app declares itself installable', async ({ page }) => {
	await page.goto('/en');
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		'/manifest.webmanifest'
	);

	const manifest = await page.request.get('/manifest.webmanifest');
	expect(manifest.ok()).toBe(true);
	const m = await manifest.json();
	expect(m.name).toBe('Scrutabor');
	expect(m.start_url).toBe('/');
	expect(m.display).toBe('standalone');
	// Chromium's install criteria: a 192px icon, plus a maskable one so
	// launchers do not clip the mark.
	expect(m.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
	expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
	for (const icon of m.icons) {
		const res = await page.request.get(icon.src);
		expect(res.ok(), icon.src).toBe(true);
	}
});

test('the status bar colour follows the chosen theme', async ({ page }) => {
	await page.goto('/en');
	const meta = page.locator('meta[name="theme-color"]');
	await expect(meta).toHaveAttribute('content', '#f7f1e6');
	await page.locator('button[aria-label*="dark"]').click();
	await expect(meta).toHaveAttribute('content', '#1a1611');
	// the choice survives a reload, resolved before first paint
	await page.reload();
	await expect(meta).toHaveAttribute('content', '#1a1611');
});

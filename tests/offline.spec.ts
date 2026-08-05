// The installable, offline shell: a missal has to open in a basement
// chapel with no signal.
import { expect, test } from '@playwright/test';

test('a first web visit installs the shell, not the book', async ({ page }) => {
	await page.goto('/en');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const cached = await page.evaluate(async () => {
		const cache = await caches.open((await caches.keys())[0]);
		return (await cache.keys()).map((r) => new URL(r.url).pathname);
	});
	// the way in is there…
	for (const path of ['/en', '/pl', '/en/ordo', '/en/editio']) {
		expect(cached, path).toContain(path);
	}
	// …and the book is not: someone who opened one page has not asked for a
	// missal. Those pages are kept as they are opened, and the installed app
	// fetches the rest (decisions #27).
	expect(cached).not.toContain('/en/ordinarium/credo');
	expect(cached.filter((p) => p.includes('/lemma/'))).toEqual([]);
	expect(cached.length).toBeLessThan(120);
});

test('a page the reader opens is kept for them', async ({ page, context }) => {
	await page.goto('/en');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await page.waitForFunction(() => !!navigator.serviceWorker.controller);

	await page.goto('/en/ordinarium/credo');
	await expect(page.locator('h1')).toHaveText('Credo');

	await context.setOffline(true);
	await page.goto('/en/ordinarium/credo');
	await expect(page.locator('h1')).toHaveText('Credo');
	// and its words still answer, because the page carries its own data
	await page.locator('#w001').click();
	await expect(page.locator('aside .form')).toHaveText('Credo');
	await context.setOffline(false);
});

test('an installed app fetches the whole book', async ({ page }) => {
	test.setTimeout(120_000);
	await page.goto('/en');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const has = (path: string) =>
		page.evaluate(async (p) => {
			const cache = await caches.open((await caches.keys())[0]);
			return !!(await cache.match(p, { ignoreSearch: true }));
		}, path);

	expect(await has('/en/ordinarium/credo'), 'the book before the signal').toBe(false);

	// the browser reports an install to the PAGE; the page forwards it
	await page.evaluate(() =>
		navigator.serviceWorker.ready.then((r) => r.active?.postMessage('cache-the-book'))
	);

	// the worker fetches in small batches so it does not compete with the
	// reader, so wait for the pages themselves rather than for a count
	for (const path of ['/en/ordinarium/credo', '/pl/ordo/canon', '/pl/lemma/mater']) {
		await expect.poll(() => has(path), { timeout: 90_000, intervals: [1000] }).toBe(true);
	}
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

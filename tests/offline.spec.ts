// The installable, offline shell: a missal has to open in a basement
// chapel with no signal. The worker's scope is /app/ — the book and
// nothing else — so the landing pages can change without ever touching
// the reader's offline copy.
import { expect, test } from './fixtures';

test('a first web visit installs the shell, not the book @online', async ({ page }) => {
	await page.goto('/app/en');
	const scope = await page.evaluate(() =>
		navigator.serviceWorker.ready.then((r) => new URL(r.scope).pathname)
	);
	// the scope IS the boundary: the worker may never control the landing
	expect(scope).toBe('/app/');

	const cached = await page.evaluate(async () => {
		const cache = await caches.open((await caches.keys())[0]);
		return (await cache.keys()).map((r) => new URL(r.url).pathname);
	});
	// the way in is there…
	for (const path of ['/app/', '/app/en', '/app/pl', '/app/en/ordo', '/app/en/editio']) {
		expect(cached, path).toContain(path);
	}
	// …and the book is not: someone who opened one page has not asked for a
	// missal. Those pages are kept as they are opened, and the installed app
	// fetches the rest (decisions #27).
	expect(cached).not.toContain('/app/en/ordinarium/credo');
	expect(cached.filter((p) => p.includes('/lemma/'))).toEqual([]);
	// nor is the landing, which lives outside the worker's world entirely
	expect(cached.filter((p) => /^\/(pl|en)(\/|$)|^\/$/.test(p))).toEqual([]);
	expect(cached.length).toBeLessThan(120);
});

test('a page the reader opens is kept for them @online', async ({ page, context }) => {
	await page.goto('/app/en');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await page.waitForFunction(() => !!navigator.serviceWorker.controller);

	await page.goto('/app/en/ordinarium/credo');
	await expect(page.locator('h1')).toHaveText('Credo');

	await context.setOffline(true);
	await page.goto('/app/en/ordinarium/credo');
	await expect(page.locator('h1')).toHaveText('Credo');
	// and its words still answer, because the page carries its own data
	await page.locator('#w001').click();
	await expect(page.locator('aside .form')).toHaveText('Credo');
	await context.setOffline(false);
});

test('an installed app fetches the whole book @online', async ({ page }) => {
	test.setTimeout(120_000);
	await page.goto('/app/en');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const has = (path: string) =>
		page.evaluate(async (p) => {
			const cache = await caches.open((await caches.keys())[0]);
			return !!(await cache.match(p, { ignoreSearch: true }));
		}, path);

	expect(await has('/app/en/ordinarium/credo'), 'the book before the signal').toBe(false);

	// the browser reports an install to the PAGE; the page forwards it
	await page.evaluate(() =>
		navigator.serviceWorker.ready.then((r) => r.active?.postMessage('cache-the-book'))
	);

	// the worker fetches in small batches so it does not compete with the
	// reader, so wait for the pages themselves rather than for a count
	for (const path of ['/app/en/ordinarium/credo', '/app/pl/ordo/canon', '/app/pl/lemma/mater']) {
		await expect.poll(() => has(path), { timeout: 90_000, intervals: [1000] }).toBe(true);
	}

	// everything fetched, still nothing from outside the book
	const strays = await page.evaluate(async () => {
		const cache = await caches.open((await caches.keys())[0]);
		return (await cache.keys())
			.map((r) => new URL(r.url).pathname)
			.filter((p) => /^\/(pl|en)(\/|$)|^\/$|^\/sitemap/.test(p));
	});
	expect(strays).toEqual([]);
});

test('the app declares itself installable @online', async ({ page }) => {
	await page.goto('/app/en');
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		'/manifest.webmanifest'
	);

	const manifest = await page.request.get('/manifest.webmanifest');
	expect(manifest.ok()).toBe(true);
	const m = await manifest.json();
	expect(m.name).toBe('Scrutabor');
	// start_url sits INSIDE scope (a prefix match — /app would not), so an
	// installed app's first document is one the worker can serve offline
	expect(m.start_url).toBe('/app/');
	expect(m.scope).toBe('/app/');
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

test('the landing is a plain web page: no manifest, no worker @online', async ({ page }) => {
	await page.goto('/en');
	await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
	// give a would-be registration the time it does not deserve
	const registrations = await page.evaluate(() =>
		navigator.serviceWorker.getRegistrations().then((r) => r.length)
	);
	expect(registrations).toBe(0);
});

test('the status bar colour follows the chosen theme @online', async ({ page }) => {
	await page.goto('/app/en');
	const meta = page.locator('meta[name="theme-color"]');
	await expect(meta).toHaveAttribute('content', '#f7f1e6');
	await page.locator('button[aria-label*="dark"]').click();
	await expect(meta).toHaveAttribute('content', '#1a1611');
	// the choice survives a reload, resolved before first paint
	await page.reload();
	await expect(meta).toHaveAttribute('content', '#1a1611');
});

test('a mangled hash boots the copy to its 404, not to a blank @folder', async ({ page }) => {
	// %-garbage in the hash used to throw URIError inside the route matcher
	// before boot completed: zero characters, zero controls, no way back but
	// the address bar. A hash that names nothing is a 404, not a crash.
	await page.goto('/app/pl/lemma/%');
	await expect(page.locator('.errorpage .status')).toHaveText('404');
	// the boundary reads the language by segment, in the hash as on the site
	await expect(page.locator('.errorpage .line')).toContainText('Ta strona nie istnieje.');
});

test('a hash mangled after boot lands on the 404 too @folder', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/pater-noster');
	await expect(page.locator('body')).toContainText('Pater noster');
	await page.evaluate(() => {
		location.hash = '#/pl/lemma/%E0%A4%A';
	});
	await expect(page.locator('.errorpage .status')).toHaveText('404');
});

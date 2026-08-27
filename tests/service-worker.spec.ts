// The update lifecycle, run for real, at two worker versions. A grep over
// the worker's source once stood here and stayed green with the reload
// commented out; nothing below can pass without the behavior itself.
//
// The spec owns a tiny static server over the SAME build/ the rest of the
// suite serves, with two switches: `suffix` patches the worker's inlined
// version literal (so flipping it IS deploying a new version), and
// `retired` makes one content-addressed asset answer 404 (so a stale copy
// can be driven into the state the notice explains). Playwright's routing
// never sees service-worker traffic, so a real server is the only honest
// harness.
//
// One deliberate limit: the whole-book fetch (thousands of files) is not
// driven end to end here — the `book-requested` flag's persistence across
// versions is asserted through IndexedDB, and the refill machinery it
// shares with the partial path is exercised by the migration tests.
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const BUILD = 'build';
const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.woff2': 'font/woff2',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webmanifest': 'application/manifest+json',
	'.txt': 'text/plain'
};

const state = { suffix: 'A', retired: null as string | null };
let server: Server;
let origin: string;

function resolvePath(pathname: string): string | null {
	const clean = pathname.replace(/\/+$/, '') || '/index';
	for (const candidate of [clean, `${clean}.html`, `${clean}/index.html`]) {
		const full = join(BUILD, candidate);
		if (existsSync(full) && statSync(full).isFile()) return full;
	}
	return null;
}

test.beforeAll(async () => {
	server = createServer((request, response) => {
		const pathname = decodeURIComponent(new URL(request.url!, 'http://x').pathname);
		if (state.retired && pathname === state.retired) {
			response.writeHead(404).end('retired');
			return;
		}
		if (pathname === '/service-worker.js') {
			// The inlined $service-worker version literal is the cache key;
			// suffixing it is a new deploy: new bytes, new version, new cache.
			const body = readFileSync(join(BUILD, 'service-worker.js'), 'utf8').replace(
				/(\d{13})/g,
				`$1-${state.suffix}`
			);
			response
				.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' })
				.end(body);
			return;
		}
		const file = resolvePath(pathname);
		if (!file) {
			response.writeHead(404).end('not found');
			return;
		}
		const extension = file.slice(file.lastIndexOf('.'));
		response.writeHead(200, { 'content-type': TYPES[extension] ?? 'application/octet-stream' });
		response.end(readFileSync(file));
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
	state.suffix = 'A';
	state.retired = null;
});

const cacheNames = (page: Page) => page.evaluate(() => caches.keys());
const cachedPaths = (page: Page, name: string) =>
	page.evaluate(
		async (cache) => (await (await caches.open(cache)).keys()).map((r) => new URL(r.url).pathname),
		name
	);

async function ready(page: Page) {
	await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
	await expect.poll(() => cacheNames(page)).toHaveLength(1);
}

test.describe('two worker versions, one book @online', () => {
	test('a first visit installs the shell only, and no update notice', async ({ page }) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		const [name] = await cacheNames(page);
		expect(name).toContain('-A');
		const paths = await cachedPaths(page, name);
		expect(paths).toContain('/app/pl');
		expect(
			paths.filter((path) => path.includes('/immutable/corpus/')),
			'a first visit does not pay for the search index or any text'
		).toEqual([]);
		await expect(page.locator('.update-notice')).toHaveCount(0);
	});

	test('opening search fetches its index lazily, into the cache', async ({ page }) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		await page.goto(`${origin}/app/pl/search?q=saecula`);
		await expect(page.locator('.results')).toBeVisible();
		const [name] = await cacheNames(page);
		await expect
			.poll(async () => (await cachedPaths(page, name)).some((p) => p.includes('/immutable/')))
			.toBe(true);
	});

	test('a new version waits behind a notice; declining keeps it waiting for the session', async ({
		page
	}) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		state.suffix = 'B';
		await page.reload();
		const notice = page.locator('.update-notice');
		await expect(notice).toBeVisible();
		// Declining is a real choice: the bar goes, the session remembers,
		// and the old worker keeps serving an intact old cache.
		await notice.getByRole('button', { name: /później|later/ }).click();
		await expect(notice).toHaveCount(0);
		await page.reload();
		await expect(page.locator('.update-notice')).toHaveCount(0);
		// The new worker may pre-install its shell; what declining protects
		// is the OLD copy: its cache stays whole and the newcomer stays
		// waiting, not controlling.
		expect((await cacheNames(page)).some((name) => name.includes('-A'))).toBe(true);
		expect(
			await page.evaluate(async () => {
				const r = await navigator.serviceWorker.getRegistration();
				return r?.waiting !== null && r?.active?.state === 'activated';
			})
		).toBe(true);
	});

	test('accepting migrates the book before the old cache goes', async ({ page }) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		// A page the reader chose, cached at v A beyond the shell.
		await page.goto(`${origin}/app/pl/orationes/pater-noster`);
		await expect(page.locator('h1')).toBeVisible();
		const [oldName] = await cacheNames(page);
		expect(await cachedPaths(page, oldName)).toContain('/app/pl/orationes/pater-noster');

		state.suffix = 'B';
		await page.reload();
		await page
			.locator('.update-notice')
			.getByRole('button', { name: /wczytaj|reload/i })
			.click();
		await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);

		// The migration completes: the new cache holds the page the reader
		// had, and only then is the superseded cache deleted.
		await expect
			.poll(() => cacheNames(page), { timeout: 20000 })
			.toEqual(expect.arrayContaining([expect.stringContaining('-B')]));
		await expect.poll(() => cacheNames(page), { timeout: 20000 }).toHaveLength(1);
		const [newName] = await cacheNames(page);
		expect(newName).toContain('-B');
		expect(await cachedPaths(page, newName)).toContain('/app/pl/orationes/pater-noster');

		// And exactly one reload: the marker survives the settled state.
		await page.evaluate(() => ((window as { __settled?: number }).__settled = 1));
		await page.waitForTimeout(800);
		expect(await page.evaluate(() => (window as { __settled?: number }).__settled)).toBe(1);
	});

	test('the migrated book still answers offline', async ({ page, context }) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		await page.goto(`${origin}/app/pl/orationes/pater-noster`);
		await expect(page.locator('h1')).toBeVisible();
		state.suffix = 'B';
		await page.reload();
		await page
			.locator('.update-notice')
			.getByRole('button', { name: /wczytaj|reload/i })
			.click();
		await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
		await expect.poll(() => cacheNames(page), { timeout: 20000 }).toHaveLength(1);

		await context.setOffline(true);
		await page.goto(`${origin}/app/pl/orationes/pater-noster`);
		await expect(page.locator('h1')).toBeVisible();
		await context.setOffline(false);
	});

	test('the whole-book request is remembered across versions', async ({ page }) => {
		await page.goto(`${origin}/app/pl`);
		await ready(page);
		await page.evaluate(() =>
			navigator.serviceWorker.ready.then((r) => r.active?.postMessage('cache-the-book'))
		);
		const flag = () =>
			page.evaluate(
				() =>
					new Promise((resolve) => {
						const open = indexedDB.open('scrutabor-sw', 1);
						open.onupgradeneeded = () => open.result.createObjectStore('state');
						open.onsuccess = () => {
							const get = open.result
								.transaction('state', 'readonly')
								.objectStore('state')
								.get('book-requested');
							get.onsuccess = () => resolve(get.result ?? null);
							get.onerror = () => resolve('unreadable');
						};
						open.onerror = () => resolve('unreadable');
					})
			);
		await expect.poll(flag).toBe(true);
		state.suffix = 'B';
		await page.reload();
		await page
			.locator('.update-notice')
			.getByRole('button', { name: /wczytaj|reload/i })
			.click();
		await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
		await expect.poll(flag, { timeout: 15000 }).toBe(true);
	});

	test('search recovers through its retry once the network does', async ({ page }) => {
		const corpusDir = join(BUILD, '_app', 'immutable', 'corpus');
		// The search chunk itself (it carries the neutral concordance): with
		// it gone the page cannot search at all — the failed state, not the
		// degraded one a missing language index correctly produces.
		const searchChunk = readdirSync(corpusDir).find((name) =>
			readFileSync(join(corpusDir, name), 'utf8').includes('"abeuntibus"')
		);
		state.retired = `/_app/immutable/corpus/${searchChunk}`;
		await page.goto(`${origin}/app/pl/search?q=zdrowas`);
		const retry = page.getByRole('button', { name: /spróbuj ponownie|try again/ });
		await expect(retry).toBeVisible({ timeout: 15000 });
		state.retired = null;
		await retry.click();
		// The retry is a fresh document — the memoized import failure cannot
		// survive it — and the query rides the address into the new page.
		await expect(page.locator('.results a').first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole('searchbox')).toHaveValue('zdrowas');
	});

	test('a retired asset turns the notice fatal, past a dismissal', async ({ page }) => {
		// The Polish concordance chunk, found on the server's own disk — the
		// page must never have fetched it, or the cache would answer and no
		// staleness could be observed.
		const corpusDir = join(BUILD, '_app', 'immutable', 'corpus');
		const plConcordance = readdirSync(corpusDir).find((name) =>
			readFileSync(join(corpusDir, name), 'utf8').includes('"zdrowas"')
		);
		expect(plConcordance, 'the pl concordance chunk exists in the build').toBeTruthy();

		await page.goto(`${origin}/app/pl`);
		await ready(page);
		state.suffix = 'B';
		await page.reload();
		const notice = page.locator('.update-notice');
		await expect(notice).toBeVisible();
		await notice.getByRole('button', { name: /później|later/ }).click();
		await expect(notice).toHaveCount(0);

		state.retired = `/_app/immutable/corpus/${plConcordance}`;
		await page.goto(`${origin}/app/pl/search?q=zdrowas`);
		await expect(page.locator('.update-notice')).toBeVisible({ timeout: 15000 });
		await expect(page.locator('.update-notice')).toContainText(/nie może już|can no longer/);
	});
});

// HTTP-cache correctness needs a real unrouted context: fixture routing
// disables that cache. The server owns both deployments and never changes
// sacred text: B differs from A only by value-identical trailing whitespace.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, expect, test, type Page } from '@playwright/test';

const BUILD = 'build';
const PATHS = ['/artifacts/canon/en.json', '/artifacts/proprium/en/pack-01.json'];
const digest = (body: string) => createHash('sha256').update(body).digest('hex');
const resources = new Map(PATHS.map((path) => [path, readFileSync(join(BUILD, path), 'utf8')]));
const worker = readFileSync(join(BUILD, 'service-worker.js'), 'utf8');
const types: Record<string, string> = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.woff2': 'font/woff2',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webmanifest': 'application/manifest+json'
};

const names = (page: Page) => page.evaluate(() => caches.keys());
const fromCache = (page: Page, suffix: string, path: string) =>
	page.evaluate(
		async ({ suffix, path }) => {
			const name = (await caches.keys()).find((name) => name.endsWith(`-${suffix}`));
			return name ? ((await (await caches.open(name)).match(path))?.text() ?? null) : null;
		},
		{ suffix, path }
	);
const fetchBody = (page: Page, path: string) =>
	page.evaluate(
		(path) => fetch(path, { mode: 'same-origin' }).then((response) => response.text()),
		path
	);

interface CacheProbeWindow extends Window {
	releaseCacheIntent?: () => Promise<void>;
}

async function holdIntent(page: Page) {
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('scrutabor-sw', 1);
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const db = open.result;
					const transaction = db.transaction('state', 'readwrite');
					const store = transaction.objectStore('state');
					let holding = true;
					const done = new Promise<void>((resolve) => {
						transaction.oncomplete = () => {
							db.close();
							resolve();
						};
					});
					(window as CacheProbeWindow).releaseCacheIntent = () => {
						holding = false;
						return done;
					};
					const keepAlive = () => {
						const get = store.get('book-requested');
						get.onsuccess = () => {
							if (holding) keepAlive();
						};
						get.onerror = () => reject(get.error);
					};
					keepAlive();
					resolve();
				};
			})
	);
}

const releaseIntent = (page: Page) =>
	page.evaluate(async () => (window as CacheProbeWindow).releaseCacheIntent?.());

for (const scenario of [
	'migration',
	'whole book',
	'first open',
	'foreground race',
	'failed migration'
]) {
	test(`${scenario} revalidates stable edition resources @online`, async () => {
		test.setTimeout(120_000);
		const state = { version: 'A', failing: false };
		const hits: {
			path: string;
			version: string;
			conditional: string | null;
			mode: string;
			status: number;
		}[] = [];
		const server = createServer((request, response) => {
			const path = new URL(request.url!, 'http://local').pathname;
			if (path === '/app/cache-probe' || path === '/cache-prime') {
				response
					.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' })
					.end('<!doctype html><title>Edition cache test</title>');
				return;
			}
			if (path === '/service-worker.js') {
				response
					.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' })
					.end(worker.replace(/(\d{13})/g, `$1-${state.version}`));
				return;
			}
			const original = resources.get(path);
			if (original !== undefined) {
				const version = state.version;
				const body = original + (version === 'A' ? '' : '\n');
				const etag = `"${digest(body)}"`;
				const conditional = request.headers['if-none-match'] as string | undefined;
				const mode = String(request.headers['sec-fetch-mode']);
				const failed =
					version === 'B' && state.failing && (scenario === 'foreground race' || path === PATHS[0]);
				hits.push({
					path,
					version,
					conditional: conditional ?? null,
					mode,
					status: failed ? 0 : conditional === etag ? 304 : 200
				});
				if (failed) {
					request.socket.destroy();
					return;
				}
				const send = () =>
					response
						.writeHead(conditional === etag ? 304 : 200, {
							'Content-Type': 'application/json',
							ETag: etag,
							'Cache-Control': version === 'A' ? 'public, max-age=604800, immutable' : 'no-cache'
						})
						.end(conditional === etag ? undefined : body);
				send();
				return;
			}
			if (
				/^\/_(headers|redirects|routes\.json|worker\.js)$/.test(path) ||
				path.endsWith('/__data.json')
			) {
				response.writeHead(404).end('not served');
				return;
			}
			const clean = path.replace(/\/+$/, '') || '/index';
			const file = [clean, `${clean}.html`, `${clean}/index.html`]
				.map((path) => join(BUILD, path))
				.find((file) => existsSync(file) && statSync(file).isFile());
			if (!file) {
				response.writeHead(404).end('not found');
				return;
			}
			response
				.writeHead(200, {
					'Content-Type': types[extname(file)] ?? 'application/octet-stream',
					'Cache-Control': 'no-cache'
				})
				.end(readFileSync(file));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const port = (server.address() as { port: number }).port;
		expect([4173, 4174, 4193]).not.toContain(port);
		const origin = `http://127.0.0.1:${port}`;
		const browser = await chromium.launch({
			args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']
		});
		const context = await browser.newContext({
			userAgent: 'Mozilla/5.0 (compatible; LocalBrowserTest/1.0)',
			serviceWorkers: 'allow'
		});
		const external: string[] = [];
		context.on('request', (request) => {
			if (!request.url().startsWith(`${origin}/`)) external.push(request.url());
		});
		const page = await context.newPage();
		try {
			await page.goto(`${origin}/app/cache-probe`);
			// Prime fresh HTTP entries while no worker exists: not CacheStorage.
			for (const path of PATHS) expect(await fetchBody(page, path)).toBe(resources.get(path));
			expect(await names(page)).toEqual([]);
			await page.evaluate(() =>
				navigator.serviceWorker.register('/service-worker.js', { scope: '/app/' })
			);
			await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
			await expect.poll(() => names(page)).toEqual([expect.stringMatching(/-A$/)]);
			const held = ['migration', 'foreground race', 'failed migration'].includes(scenario);
			if (held)
				for (const path of PATHS) {
					expect(await fetchBody(page, path)).toBe(resources.get(path));
					await expect.poll(() => fromCache(page, 'A', path)).toBe(resources.get(path));
				}
			else for (const path of PATHS) expect(await fromCache(page, 'A', path)).toBeNull();

			state.version = 'B';
			state.failing = scenario === 'failed migration' || scenario === 'foreground race';
			await page.evaluate(async () => {
				await (await navigator.serviceWorker.getRegistration())!.update();
			});
			await expect
				.poll(() =>
					page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)
				)
				.toBe(true);
			await page.evaluate(async () => {
				const registration = (await navigator.serviceWorker.getRegistration())!;
				await new Promise<void>((resolve) => {
					navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
						once: true
					});
					registration.waiting!.postMessage('activate-release');
				});
			});
			await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
			await expect.poll(() => names(page)).toContainEqual(expect.stringMatching(/-B$/));

			if (scenario === 'foreground race') {
				// Activation must finish before functional fetch events can run.
				// Its failed refill kept A. Re-prime fresh HTTP A outside the
				// worker scope, then delay migration's existing intent read.
				// Foreground can fill B before bulk computes its missing list.
				expect(await names(page)).toHaveLength(2);
				state.version = 'A';
				const primer = await context.newPage();
				await primer.goto(`${origin}/cache-prime`);
				for (const path of PATHS)
					expect(
						await primer.evaluate(
							(path) =>
								fetch(path, { cache: 'reload', mode: 'same-origin' }).then((response) =>
									response.text()
								),
							path
						)
					).toBe(resources.get(path));
				state.version = 'B';
				const primed = hits.length;
				for (const path of PATHS) expect(await fetchBody(primer, path)).toBe(resources.get(path));
				expect(hits.length, 'A remains fresh in HTTP cache before the race').toBe(primed);
				await primer.close();
				state.failing = false;
				await holdIntent(page);
				await page.evaluate(() => navigator.serviceWorker.controller!.postMessage('settle-caches'));
				expect(await names(page)).toHaveLength(2); // A cannot go while B refills.
				for (const path of PATHS) {
					expect(
						await fetchBody(page, path),
						'foreground cannot cache stale HTTP bytes during migration'
					).toBe(resources.get(path) + '\n');
					expect(await fromCache(page, 'B', path)).toBe(resources.get(path) + '\n');
				}
				await releaseIntent(page);
			}
			if (scenario === 'failed migration') {
				await expect
					.poll(() => hits.filter((hit) => hit.version === 'B' && hit.status === 0).length)
					.toBeGreaterThan(0);
				await expect
					.poll(() => fromCache(page, 'B', PATHS[1]))
					.toBe(resources.get(PATHS[1]) + '\n');
				expect(await names(page)).toHaveLength(2);
				expect(await fromCache(page, 'B', PATHS[0])).toBeNull();
				expect(
					await fetchBody(page, PATHS[0]),
					'real network failure falls back to A without completing B'
				).toBe(resources.get(PATHS[0]));
				expect(await fromCache(page, 'B', PATHS[0])).toBeNull();
				await context.setOffline(true);
				expect(await fetchBody(page, PATHS[0])).toBe(resources.get(PATHS[0]));
				expect(await fetchBody(page, PATHS[1])).toBe(resources.get(PATHS[1]) + '\n');
				await context.setOffline(false);
				state.failing = false;
				await page.evaluate(() => navigator.serviceWorker.controller!.postMessage('settle-caches'));
			}
			if (scenario === 'whole book')
				await page.evaluate(() =>
					navigator.serviceWorker.controller!.postMessage('cache-the-book')
				);
			if (scenario === 'whole book')
				for (const path of PATHS)
					await expect
						.poll(() => fromCache(page, 'B', path), { timeout: 30_000 })
						.toBe(resources.get(path) + '\n');
			await expect
				.poll(() => names(page), { timeout: 30_000 })
				.toEqual([expect.stringMatching(/-B$/)]);
			for (const path of PATHS) {
				const expected = resources.get(path) + '\n';
				expect(JSON.parse(expected)).toEqual(JSON.parse(resources.get(path)!));
				expect(
					await fetchBody(page, path),
					'B must reach new server despite A immutable HTTP entry'
				).toBe(expected);
				await expect.poll(() => fromCache(page, 'B', path)).toBe(expected);
				expect(
					hits.some(
						(hit) =>
							hit.path === path &&
							hit.version === 'B' &&
							(scenario === 'whole book' || hit.conditional !== null) &&
							hit.status === 200
					)
				).toBe(true);
			}
			const networkCount = hits.length;
			// Cache-first once current-edition bytes exist; no forced network.
			for (const path of PATHS)
				expect(await fetchBody(page, path)).toBe(resources.get(path) + '\n');
			expect(hits.length).toBe(networkCount);
			await context.setOffline(true);
			for (const path of PATHS)
				expect(await fetchBody(page, path)).toBe(resources.get(path) + '\n');
		} finally {
			try {
				await releaseIntent(page);
				await test.info().attach('cache-transition', {
					body: Buffer.from(
						JSON.stringify(
							{
								scenario,
								port,
								hits,
								routing: false,
								external,
								cacheNames: await names(page),
								resources: await Promise.all(
									PATHS.map(async (path) => ({
										path,
										A: digest(resources.get(path)!),
										B: digest(resources.get(path)! + '\n'),
										cachedA: await fromCache(page, 'A', path).then((body) =>
											body === null ? null : digest(body)
										),
										cachedB: await fromCache(page, 'B', path).then((body) =>
											body === null ? null : digest(body)
										)
									}))
								)
							},
							null,
							2
						)
					),
					contentType: 'application/json'
				});
			} finally {
				await context.close();
				await browser.close();
				await new Promise<void>((resolve) => server.close(() => resolve()));
				expect(external).toEqual([]);
			}
		}
	});
}

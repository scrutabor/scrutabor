// The deployed tree, served as the static host serves it — nothing but the
// files under build/ and the host's own four rules (scripts/static-host.ts).
//
// Every other hosted scenario runs against SvelteKit's preview, which still
// answers from .svelte-kit/output: the route sidecars the build prunes exist
// there, and a page the build never emitted still reaches the server
// runtime. Two release-blocking defects hid behind exactly that difference,
// so what happens between the reader and the static host is proven here.
import { expect, settled, test } from './fixtures';

const PATER = '/app/pl/orationes/pater-noster';

test('the host answers a pruned route sidecar with its 404 page @static-host', async ({
	request
}) => {
	const sidecar = await request.get(`${PATER}/__data.json`);
	expect(sidecar.status()).toBe(404);
	const page = await request.get(PATER);
	expect(page.status()).toBe(200);
});

// A tap pushes a shallow `?w=` entry. Reloading that address — or having a
// phone restore a discarded tab — starts a document that has not navigated
// yet, so the framework treats the Back press across that entry as a real
// navigation. It must not need anything the host does not serve: the page
// stays, the panel closes, and no route data is requested.
for (const [surface, path, word] of [
	['a prayer', PATER, '#w008'],
	['a complete formulary', '/app/pl/formularium/dominica-i-adventus', '.proper-part button.word'],
	['an Ordo movement', '/app/pl/ordo/catechumenorum', '#credo\\.w103']
] as const) {
	test(`Back after a reload keeps ${surface} on the page @static-host`, async ({ page }) => {
		const routeData: string[] = [];
		page.on('request', (sent) => {
			const url = new URL(sent.url());
			if (url.pathname.endsWith('/__data.json')) routeData.push(url.pathname);
		});
		await page.goto(path);
		const title = await page.locator('h1').first().innerText();
		await page.locator(word).first().click();
		await expect(page).toHaveURL(/[?&]w=/);
		await expect(page.locator('aside .form')).toBeVisible();

		await page.reload();
		await settled(page);
		await expect(page.locator('aside .form')).toBeVisible();

		await page.goBack();
		await expect(page.locator('h1').first()).toHaveText(title);
		await expect(page.locator('.errorpage')).toHaveCount(0);
		await expect(page.locator('aside')).toHaveCount(0);
		await expect(page).not.toHaveURL(/[?&]w=/);

		await page.goForward();
		await expect(page.locator('h1').first()).toHaveText(title);
		await expect(page.locator('.errorpage')).toHaveCount(0);
		await expect(page.locator('aside .form')).toBeVisible();

		expect(routeData, 'history traversal asked the host for route data').toEqual([]);
	});
}

const workerReady = (page: import('@playwright/test').Page) =>
	page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

const tell = (page: import('@playwright/test').Page, message: string) =>
	page.evaluate(
		(text) => navigator.serviceWorker.ready.then((r) => r.active?.postMessage(text)),
		message
	);

/** The current edition's cache: the worker's own, never a planted one. */
const current = async (page: import('@playwright/test').Page) =>
	page.evaluate(async () => {
		const names = (await caches.keys()).filter(
			(name) => name.startsWith('scrutabor-') && !name.endsWith('-superseded')
		);
		return names[0] ?? null;
	});

const cached = (page: import('@playwright/test').Page, path: string) =>
	page.evaluate(async (target) => {
		const names = (await caches.keys()).filter(
			(name) => name.startsWith('scrutabor-') && !name.endsWith('-superseded')
		);
		const cache = await caches.open(names[0]);
		return !!(await cache.match(target, { ignoreSearch: true }));
	}, path);

/** A cache the previous edition left behind, holding what a reader opened. */
const plantSuperseded = (page: import('@playwright/test').Page, paths: string[]) =>
	page.evaluate(async (held) => {
		const cache = await caches.open('scrutabor-previous-superseded');
		for (const path of held) {
			await cache.put(
				path,
				new Response('previous edition', { headers: { 'content-type': 'text/html' } })
			);
		}
	}, paths);

const supersededCaches = (page: import('@playwright/test').Page) =>
	page.evaluate(async () => (await caches.keys()).filter((name) => name.endsWith('-superseded')));

// The previous edition's worker cached the route sidecars its client router
// fetched, and its whole-book list named every one of them. A migration that
// still counted them could never finish: the host answers 404, the entry is
// never cached, and the superseded book is kept — and refetched — forever.
test('an installed book completes without route sidecars and retires the previous cache @static-host', async ({
	page
}) => {
	test.setTimeout(240_000);
	await page.goto('/app/en');
	await workerReady(page);
	await plantSuperseded(page, [
		'/app/en/ordinarium/credo',
		'/app/en/ordinarium/credo/__data.json',
		'/app/en/formularium/dominica-i-adventus/__data.json'
	]);

	await tell(page, 'cache-the-book');
	for (const path of [
		'/app/en/ordinarium/credo',
		'/app/pl/lemma',
		'/artifacts/proprium/pl/pack-01.json'
	]) {
		await expect.poll(() => cached(page, path), { timeout: 180_000, intervals: [1000] }).toBe(true);
	}
	expect(await cached(page, '/app/en/ordinarium/credo/__data.json')).toBe(false);
	expect(await cached(page, '/app/en/formularium/dominica-i-adventus/__data.json')).toBe(false);

	// The next wake settles the migration: the new book is complete, so the
	// previous edition's cache goes.
	await tell(page, 'settle-caches');
	await expect
		.poll(() => supersededCaches(page), { timeout: 120_000, intervals: [1000] })
		.toEqual([]);
	expect(await current(page)).not.toBeNull();
});

test('a returning reader who held a sidecar still migrates to one cache @static-host', async ({
	page
}) => {
	await page.goto('/app/en');
	await workerReady(page);
	await plantSuperseded(page, [
		'/app/pl/orationes/pater-noster',
		'/app/pl/orationes/pater-noster/__data.json'
	]);
	await tell(page, 'settle-caches');
	await expect
		.poll(() => cached(page, '/app/pl/orationes/pater-noster'), {
			timeout: 60_000,
			intervals: [500]
		})
		.toBe(true);
	await expect
		.poll(() => supersededCaches(page), { timeout: 60_000, intervals: [500] })
		.toEqual([]);
	expect(await cached(page, '/app/pl/orationes/pater-noster/__data.json')).toBe(false);
});

// Addresses the previous edition published — every dictionary entry had its
// own page and every Proper text stood alone — keep answering.
test('the previous edition’s dictionary and Proper addresses redirect @static-host', async ({
	request
}) => {
	const lemma = await request.get('/app/pl/lemma/oro', { maxRedirects: 0 });
	expect(lemma.status()).toBe(301);
	expect(lemma.headers()['location']).toBe('/app/pl/lemma?l=oro');

	const english = await request.get('/app/en/lemma/plenus', { maxRedirects: 0 });
	expect(english.headers()['location']).toBe('/app/en/lemma?l=plenus');

	const proper = await request.get('/app/pl/proprium/dominica-i-adventus-introitus', {
		maxRedirects: 0
	});
	expect(proper.status()).toBe(301);
	expect(proper.headers()['location']).toBe(
		'/app/pl/formularium/dominica-i-adventus#text-proprium-dominica-i-adventus-introitus'
	);
});

import type { Page } from '@playwright/test';
import { atRoute, expect, settled, test } from './fixtures';

test.use({ serviceWorkers: 'block' });

const departures = [
	'formularium/sanctissimi-nominis-iesu',
	'commemoratio/litaniae-maiores',
	'ordo/catechumenorum?dies=2026-09-21',
	'ordo?dies=2026-09-21'
];

// Follow the edition's own address: a native file/hash link in the folder,
// or a site path on the host. Back must work with native hash event ordering.
async function follow(page: Page, href: string): Promise<void> {
	await page.evaluate((href) => {
		const anchor = document.createElement('a');
		if (location.protocol === 'file:') {
			const target = new URL(location.href);
			target.hash = href.replace(/^\/app(?=\/|$)/, '');
			anchor.href = target.href;
		} else anchor.href = href;
		anchor.id = 'history-destination';
		anchor.textContent = 'Open reading';
		document.body.prepend(anchor);
	}, href);
	await page.locator('#history-destination').click();
	await settled(page);
}

async function completeDeparture(page: Page, departure: string): Promise<void> {
	if (departure.startsWith('ordo')) {
		// Enabled means the date is known; this state additionally requires the
		// selected Mass payload to have arrived, including on the Ordo index.
		await expect(page.locator('.picker.day .states .sr-only')).toHaveCount(1);
		if (departure.startsWith('ordo/')) {
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
		}
	} else {
		await expect(page.locator('.proper-part').last().locator('button.word').last()).toHaveText(
			/\S/
		);
	}
}

// Location normalization is deliberately deferred until a frame after mount.
// Complete that frame before leaving so the traversal exercises settled handlers.
async function locationFrames(page: Page): Promise<void> {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
			)
	);
}

async function selectedPrayer(
	page: Page,
	selection: 'word' | 'segment',
	lang: 'pl' | 'en'
): Promise<void> {
	await expect(page.locator('h1[lang="la"]')).toHaveText('Pater noster');
	if (selection === 'word') {
		await expect(page.locator('[id="w001"]')).toHaveClass(/selected/);
		// English aligns Pater + noster as one construction ('Our Father');
		// Polish keeps their individual word captions.
		await expect(page.locator('aside.panel .form')).toHaveText(
			lang === 'en' ? 'Pater noster' : 'Pater'
		);
	} else {
		await expect(page.locator('.verse.segment-selected')).toHaveAttribute('id', 's02');
		await expect(page.locator('aside.panel')).toHaveCount(0);
	}
}

for (const host of ['', ' @online @static-host'])
	for (const lang of ['pl', 'en'] as const)
		for (const selection of ['word', 'segment'] as const)
			for (const departure of departures)
				test(`${lang} ${selection}: Back and Forward preserve a prayer citation after ${departure}${host}`, async ({
					page
				}) => {
					const query = selection === 'word' ? '?w=w001' : '?s=s02';
					await page.goto(`/app/${lang}/orationes/pater-noster${query}`);
					await selectedPrayer(page, selection, lang);
					const prior = page.url();
					await follow(page, `/app/${lang}/${departure}`);
					await expect(page).toHaveURL(atRoute(`/app/${lang}/${departure.split('?')[0]}`));
					if (departure.startsWith('ordo')) {
						await expect(page.locator('.day-open')).toBeEnabled();
						await expect(page).toHaveURL(/\?dies=2026-09-21$/);
					} else await expect(page.locator('.proper-part')).not.toHaveCount(0);
					await completeDeparture(page, departure);
					await locationFrames(page);
					const next = page.url();
					// These are browser traversals, with the browser's real popstate
					// and hashchange ordering, rather than synthetic history events.
					await page.goBack();
					await expect(page.locator('h1[lang="la"]')).toHaveText('Pater noster');
					await locationFrames(page);
					await selectedPrayer(page, selection, lang);
					await expect(page).toHaveURL(prior);
					await page.goForward();
					await settled(page);
					await expect(page).toHaveURL(next);
					if (departure.startsWith('ordo')) {
						await expect(page.locator('.day-open')).toBeEnabled();
						await expect(page.locator('.day-open .choice-date')).toHaveText(
							lang === 'pl' ? '21 września 2026' : '21 September 2026'
						);
					} else await expect(page.locator('.proper-part')).not.toHaveCount(0);
					await completeDeparture(page, departure);
					await locationFrames(page);
					await page.goBack();
					await expect(page.locator('h1[lang="la"]')).toHaveText('Pater noster');
					await locationFrames(page);
					await selectedPrayer(page, selection, lang);
					await expect(page).toHaveURL(prior);
				});

type FrameWindow = typeof window & {
	readingFrames: { scheduled: number; cancelled: number; release: () => void };
};

for (const lang of ['pl', 'en'] as const)
	for (const departure of [
		'formularium/sanctissimi-nominis-iesu?s=missing',
		'ordo/catechumenorum?dies=2026-09-21'
	])
		test(`${lang}: a queued location update cannot overwrite Back from ${departure} @folder`, async ({
			page
		}) => {
			await page.goto(`/app/${lang}/orationes/pater-noster?s=s02`);
			await selectedPrayer(page, 'segment', lang);
			const prior = page.url();
			await page.evaluate(() => {
				const request = window.requestAnimationFrame.bind(window);
				const cancel = window.cancelAnimationFrame.bind(window);
				const pending = new Map<number, FrameRequestCallback>();
				let next = 0;
				const control = {
					scheduled: 0,
					cancelled: 0,
					release() {
						window.requestAnimationFrame = request;
						window.cancelAnimationFrame = cancel;
						for (const action of pending.values()) request(action);
						pending.clear();
					}
				};
				(window as FrameWindow).readingFrames = control;
				window.requestAnimationFrame = (action) => {
					control.scheduled += 1;
					pending.set(--next, action);
					return next;
				};
				window.cancelAnimationFrame = (id) => {
					if (pending.delete(id)) control.cancelled += 1;
					else cancel(id);
				};
			});
			try {
				// Activate the real anchor without Playwright's frame-based pointer
				// stability wait: these frames are deliberately held by the test.
				await page.evaluate((href) => {
					const anchor = document.createElement('a');
					const target = new URL(location.href);
					target.hash = href.replace(/^\/app(?=\/|$)/, '');
					anchor.href = target.href;
					document.body.append(anchor);
					anchor.click();
				}, `/app/${lang}/${departure}`);
				if (departure.startsWith('ordo')) await expect(page.locator('.day-open')).toBeEnabled();
				else await expect(page.locator('.proper-part')).not.toHaveCount(0);
				await expect
					.poll(() => page.evaluate(() => (window as FrameWindow).readingFrames.scheduled))
					.toBeGreaterThan(0);
				await page.goBack();
				await selectedPrayer(page, 'segment', lang);
				await expect(page).toHaveURL(prior);
				const cancelled = await page.evaluate(() => {
					const control = (window as FrameWindow).readingFrames;
					control.release();
					return control.cancelled;
				});
				expect(cancelled, 'a departing page must cancel its pending frame').toBeGreaterThan(0);
				await page.evaluate(
					() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
				);
				await expect(page).toHaveURL(prior);
				await selectedPrayer(page, 'segment', lang);
			} finally {
				await page.evaluate(() => (window as FrameWindow).readingFrames.release());
			}
		});

type TraversalWindow = typeof window & {
	traversalFrameOrder: { events: number; flushed: number };
};

// Stress ownership by flushing departing work in a microtask after the final
// real popstate listener. This is deliberately stronger than native frame
// scheduling; ordinary history cases exercise the browser's own frame timing.
async function frameBeforeHashChange(page: Page): Promise<void> {
	await page.evaluate(() => {
		const request = window.requestAnimationFrame.bind(window);
		const cancel = window.cancelAnimationFrame.bind(window);
		const pending = new Map<number, FrameRequestCallback>();
		let next = 0;
		const timing = { events: 0, flushed: 0 };
		(window as TraversalWindow).traversalFrameOrder = timing;
		window.requestAnimationFrame = (action) => {
			pending.set(--next, action);
			return next;
		};
		window.cancelAnimationFrame = (id) => {
			if (!pending.delete(id)) cancel(id);
		};
		// Registered after the mounted components: each departing handler sees
		// the new address before its queued frame is allowed to run.
		addEventListener(
			'popstate',
			() => {
				timing.events += 1;
				queueMicrotask(() => {
					window.requestAnimationFrame = request;
					window.cancelAnimationFrame = cancel;
					for (const [id, action] of pending) {
						pending.delete(id);
						timing.flushed += 1;
						action(performance.now());
					}
				});
			},
			{ once: true }
		);
	});
}

for (const lang of ['pl', 'en'] as const)
	for (const departure of [
		'formularium/sanctissimi-nominis-iesu',
		'ordo/catechumenorum?dies=2026-09-21'
	])
		test(`${lang}: a traversal frame before hashchange preserves the prior citation after ${departure} @folder`, async ({
			page
		}, testInfo) => {
			await page.goto(`/app/${lang}/orationes/pater-noster?s=s02`);
			await selectedPrayer(page, 'segment', lang);
			const prior = page.url();
			await follow(page, `/app/${lang}/${departure}`);
			await completeDeparture(page, departure);
			await locationFrames(page);
			await frameBeforeHashChange(page);
			await page.goBack();
			const timing = await page.evaluate(() => (window as TraversalWindow).traversalFrameOrder);
			await testInfo.attach('traversal-frame-order', {
				body: JSON.stringify(timing),
				contentType: 'application/json'
			});
			expect(timing.events, 'the browser must dispatch a real traversal').toBe(1);
			await expect(page.locator('h1[lang="la"]')).toHaveText('Pater noster');
			await locationFrames(page);
			await selectedPrayer(page, 'segment', lang);
			await expect(page).toHaveURL(prior);
		});

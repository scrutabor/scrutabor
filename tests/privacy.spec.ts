// The visit counter, and the gates that hold it shut.
//
// The whole suite already proves the negative by accident: fixtures.ts
// fails any test whose page reaches the network, naming an analytics
// beacon as the case it was written for, so a counter that fired on
// localhost would turn every spec red at once. That is a good alarm and a
// poor explanation. These tests say what is actually keeping it quiet, so
// that a change to the gates fails HERE, with a name, instead of scattering
// four hundred unrelated failures.
//
// @online throughout: the downloaded folder has no counter in it at all —
// scripts/build-offline.mjs cuts the block and refuses to package a copy
// where the name survived.
import { expect, test } from './fixtures';

const BEACON = 'cloudflareinsights';

test.describe('the visit counter @online', () => {
	for (const path of ['/pl', '/en/privacy', '/app/pl', '/app/pl/orationes/pater-noster']) {
		test(`never loads on a host that is not the site — ${path}`, async ({ page }) => {
			await page.goto(path);
			const scripts = await page.evaluate(() =>
				[...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src') ?? '')
			);
			expect(scripts.filter((src) => src.includes(BEACON))).toEqual([]);
			expect(await page.locator('script[data-cf-beacon]').count()).toBe(0);
		});
	}

	test('ships the gates it is supposed to ship', async ({ page }) => {
		// The block IS in the served page — it is simply refusing. If it were
		// missing from the HTML the tests above would pass for the wrong
		// reason, and would keep passing after someone deleted the counter.
		await page.goto('/pl');
		const html = await page.content();
		expect(html).toContain(BEACON);
		expect(html).toContain("location.hostname !== 'scrutabor.org'");
	});

	test('the privacy page says what the counter does, in both languages', async ({ page }) => {
		// The page and src/app.html are one claim in two files. This does not
		// prove they agree, but it does stop the page from quietly reverting
		// to the older, now untrue "no analytics" wording.
		await page.goto('/en/privacy');
		await expect(page.getByText('Cloudflare Web Analytics')).toBeVisible();
		await expect(page.getByText('Global Privacy Control')).toBeVisible();
		// The page does NOT argue that it needs no consent banner. It says
		// what is counted and lets that stand — the guilty explain themselves
		// (owner, 2026-08-12).
		await expect(page.getByText('consent banner')).toHaveCount(0);

		// The counts are totals. Said outright, because a list of language,
		// country and browser can otherwise read as a description of one
		// visit rather than of a column of numbers (owner, 2026-08-12).
		// Twice on the page by design: stated here, referred back to by the
		// closing point about logs.
		await expect(page.getByText('aggregate counts').first()).toBeVisible();
		await expect(page.getByText('no trace in them of what any one reader did')).toBeVisible();

		await page.goto('/pl/privacy');
		await expect(page.getByText('Cloudflare Web Analytics')).toBeVisible();
		await expect(page.getByText('Global Privacy Control')).toBeVisible();
		// Said once and referred back to once, so anchor on the first.
		await expect(page.getByText('zagregowane dane').first()).toBeVisible();
		await expect(page.getByText('Nie ma w nich śladu tego, co robił')).toBeVisible();
	});
});

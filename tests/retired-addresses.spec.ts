import { expect, test } from './fixtures';

test.use({ serviceWorkers: 'block' });

const mass = 'commemoratio-omnium-fidelium-defunctorum-missa-iii';
const collect = `${mass}-collecta`;
const retired = `${collect}.w014`;
const fragment = `#text-proprium-${collect}`;
const ordoQuery = `dies=2026-11-02&missa=${mass}`;

async function expectSegment(page: import('@playwright/test').Page, id: string) {
	await expect(page.locator(`[id="${id}"]`)).toHaveClass(/segment-selected/);
	await expect(page.locator('.segment-selected')).toHaveCount(1);
	await expect(page.locator('aside')).toHaveCount(0);
	await expect(page).not.toHaveURL(/[?&]w=/);
}

for (const lang of ['pl', 'en']) {
	const full = `/app/${lang}/formularium/${mass}`;
	const single = `/app/${lang}/proprium/${collect}`;
	const ordo = `/app/${lang}/ordo/catechumenorum?${ordoQuery}`;

	test(`${lang}: a retired prefixed word reaches its segment in the full formulary`, async ({
		page
	}) => {
		await page.goto(`${full}?w=${retired}`);
		await expectSegment(page, `${collect}-s01`);
		await expect(page).toHaveURL(new RegExp(`[?&]s=${collect}\\.s01(?:#|$)`));
		await expect(page.locator(`[id="${collect}-s01"]`)).toBeInViewport();
	});

	test(`${lang}: a bare retired word and part fragment resolve together`, async ({ page }) => {
		await page.goto(`${full}?w=w014${fragment}`);
		await expectSegment(page, `${collect}-s01`);
		await expect(page).toHaveURL(new RegExp(`[?&]s=${collect}\\.s01(?:#|$)`));
	});

	test(`${lang}: an explicit live segment wins over the full-formulary fallback`, async ({
		page
	}) => {
		await page.goto(`${full}?s=${collect}.s02&w=${retired}`);
		await expectSegment(page, `${collect}-s02`);
		await expect(page).toHaveURL(new RegExp(`[?&]s=${collect}\\.s02(?:#|$)`));
	});

	test(`${lang}: stale words are removed without discarding a valid citation`, async ({ page }) => {
		await page.goto(`${full}?s=${collect}.s02&w=${collect}.w99999`);
		await expectSegment(page, `${collect}-s02`);
		await page.goto(`${full}?s=missing.s01&w=w014#text-proprium-missing`);
		await expect(page).not.toHaveURL(/[?&][sw]=/);
		await expect(page.locator('.segment-selected')).toHaveCount(0);
		await expect(page.locator('aside')).toHaveCount(0);
	});

	test(`${lang}: a live word still opens its panel beside a segment citation`, async ({ page }) => {
		await page.goto(`${full}?s=${collect}.s02&w=${collect}.w001`);
		await expect(page.locator('aside .form')).toBeVisible();
		await expect(page.locator(`[id="${collect}.w001"]`)).toHaveClass(/selected/);
		await expect(page.locator(`[id="${collect}-s02"]`)).toHaveClass(/segment-selected/);
	});

	test(`${lang}: the standalone reader preserves the explicit segment @folder`, async ({
		page
	}) => {
		await page.goto(`${single}?s=s02&w=w014`);
		await expectSegment(page, 's02');
		await expect(page).toHaveURL(/[?&]s=s02(?:#|$)/);
	});

	test(`${lang}: a published legacy redirect preserves both explicit selectors @static-host`, async ({
		page
	}) => {
		// Only the forty Proper texts published before the combined reader have
		// host redirects. Later texts were never published at standalone URLs.
		const old = 'dominica-i-adventus-collecta';
		await page.goto(`/app/${lang}/proprium/${old}?s=s02&w=w001`);
		await expect(page.locator(`[id="${old}-s02"]`)).toHaveClass(/segment-selected/);
		await expect(page.locator(`[id="${old}.w001"]`)).toHaveClass(/selected/);
		await expect(page.locator('aside .form')).toBeVisible();
		const url = new URL(page.url());
		expect(url.pathname).toBe(`/app/${lang}/formularium/dominica-i-adventus`);
		expect(url.searchParams.get('s')).toBe(`${old}.s02`);
		expect(url.searchParams.get('w')).toBe(`${old}.w001`);
		expect(url.hash).toBe(`#text-proprium-${old}`);
	});

	test(`${lang}: Ordo resolves the retired word after loading its proper and reveals it`, async ({
		page
	}) => {
		await page.goto(`${ordo}&w=${retired}`);
		await expectSegment(page, `${collect}-s01`);
		await expect(page.locator(`[id="${collect}-s01"]`)).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`[?&]s=${collect}\\.s01(?:#|$)`));
	});
}

// Put an older URL in this document's history, keeping the router's own state.
// Back restores it without clearing the in-memory proper cache through goto.
async function restoreQuery(page: import('@playwright/test').Page, query: string) {
	await page.evaluate((query) => {
		const original = location.href;
		const folder = location.protocol === 'file:';
		const url = new URL(
			folder ? location.hash.slice(1) : location.href,
			'https://scrutabor.invalid'
		);
		const restored = new URL(`${url.pathname}?${query}`, url);
		history.pushState(
			history.state,
			'',
			folder ? `#${restored.pathname}${restored.search}${restored.hash}` : restored
		);
		history.pushState(history.state, '', original);
	}, query);
	await page.goBack();
}

test('a cached proper keeps both day canonicalization and retired-word resolution', async ({
	page
}) => {
	const day = 'sancti-matthaei-apostoli-et-evangelistae';
	const introit = `${day}-introitus`;
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-09-21');
	await expect(page.locator(`[id="${introit}.w001"]`)).toBeVisible();
	await restoreQuery(page, `dies=2026-09-21&missa=${day}&w=${introit}.w062`);
	await expectSegment(page, `${introit}-s01`);
	await expect(page).not.toHaveURL(/[?&]missa=/);
});

test('a cached bare word keeps its part fragment while the day is canonicalized', async ({
	page
}) => {
	const day = 'sancti-matthaei-apostoli-et-evangelistae';
	const introit = `${day}-introitus`;
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-09-21');
	await expect(page.locator(`[id="${introit}.w001"]`)).toBeVisible();
	await restoreQuery(page, `dies=2026-09-21&missa=${day}&w=w062#text-proprium-${introit}`);
	await expectSegment(page, `${introit}-s01`);
	await expect(page).not.toHaveURL(/[?&]missa=/);
	await expect(page).toHaveURL(new RegExp(`#text-proprium-${introit}$`));
});

test('day canonicalization never guesses a bare word with an unknown part', async ({ page }) => {
	const day = 'sancti-matthaei-apostoli-et-evangelistae';
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-09-21');
	await expect(page.locator(`[id="${day}-introitus.w001"]`)).toBeVisible();
	await restoreQuery(page, `dies=2026-09-21&missa=${day}&w=w062#text-proprium-missing`);
	await expect(page).not.toHaveURL(/[?&][ws]=/);
	await expect(page).not.toHaveURL(/[?&]missa=/);
	await expect(page).toHaveURL(/#text-proprium-missing$/);
	await expect(page.locator('.segment-selected')).toHaveCount(0);
	await expect(page.locator('aside')).toHaveCount(0);
});

test('restoring another day never resolves against the previous proper', async ({ page }) => {
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-09-21');
	await expect(
		page.locator('[id="sancti-matthaei-apostoli-et-evangelistae-introitus.w001"]')
	).toBeVisible();
	await restoreQuery(page, `${ordoQuery}&w=${retired}`);
	await expectSegment(page, `${collect}-s01`);
	await expect(page.locator('.choice-date')).toContainText('2 listopada 2026');
});

test('a pending proper does not erase a retired citation @online', async ({ page }) => {
	let release!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/artifacts/proprium/**', async (route) => {
		await pending;
		await route.continue();
	});
	try {
		await page.goto(`/app/pl/ordo/catechumenorum?${ordoQuery}&w=${retired}`);
		await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
		await expect(page).toHaveURL(new RegExp(`[?&]w=${collect}\\.w014(?:#|$)`));
		release();
		await expectSegment(page, `${collect}-s01`);
	} finally {
		release();
	}
});

test('a failed proper retains its unresolved citation for retry @online', async ({ page }) => {
	await page.route('**/artifacts/proprium/**', (route) => route.abort('failed'));
	await page.goto(`/app/pl/ordo/catechumenorum?${ordoQuery}&w=${retired}`);
	await expect(page.locator('.picker.day .state')).toBeVisible();
	await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
	await expect(page).toHaveURL(new RegExp(`[?&]w=${collect}\\.w014(?:#|$)`));
	await expect(page.locator('aside')).toHaveCount(0);
});

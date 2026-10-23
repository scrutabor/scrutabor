import { expect, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} dated Canon uses actual child bodies and complete clause addresses`, async ({
		page
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('scrutabor-role', 'sacerdos');
			localStorage.setItem('scrutabor-help', '1');
		});
		await page.goto(
			`/app/${language}/ordo/canon?dies=2026-04-02&w=hanc-igitur-in-cena-domini.w043`
		);
		// English keeps the whole petition as one construction; Polish now captions its two
		// members apart (wyrwanie… and zaliczenie… nakazał), so w043 opens the first of five.
		await expect(page.locator('aside .construction-card')).toHaveCount(language === 'pl' ? 5 : 12);
		for (const slug of [
			'communicantes-in-cena-domini',
			'hanc-igitur-in-cena-domini',
			'qui-pridie-in-cena-domini'
		]) {
			await expect(page.locator(`[id="${slug}.w001"]`)).toHaveCount(1);
			await expect(page.locator(`a.part-title[href*="${slug}"]`)).toHaveCount(1);
		}
		for (const ordinary of ['communicantes', 'hanc-igitur', 'qui-pridie'])
			await expect(page.locator(`[id="${ordinary}.w001"]`)).toHaveCount(0);
		await expect(page).toHaveURL(/dies=2026-04-02/);
		await expect(page).toHaveURL(/w=hanc-igitur-in-cena-domini\.w043/);
	});
}

test('valid Canon transport failure preserves its address without substituting Ordinary @online', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.route('**/artifacts/canon/en.json', (route) =>
		route.fulfill({ status: 503, body: 'unavailable' })
	);
	await page.goto('/app/en/ordo/canon?dies=2026-04-02&w=qui-pridie-in-cena-domini.w001');
	await expect(page.locator('.part-loading')).toHaveCount(0);
	for (const ordinary of ['communicantes', 'hanc-igitur', 'qui-pridie'])
		await expect(page.locator(`[id="${ordinary}.w001"]`)).toHaveCount(0);
	await expect(page).toHaveURL(/w=qui-pridie-in-cena-domini\.w001/);
	await expect(page.locator('.picker .state')).toContainText('could');
});

test('unresolved prerender and slow hydration never expose Ordinary for a required Canon @online', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	let releaseScripts!: () => void;
	let releaseCanon!: () => void;
	const scripts = new Promise<void>((resolve) => {
		releaseScripts = resolve;
	});
	const canon = new Promise<void>((resolve) => {
		releaseCanon = resolve;
	});
	await page.route('**/*.js', async (route) => {
		await scripts;
		await route.continue();
	});
	await page.route('**/artifacts/canon/en.json', async (route) => {
		await canon;
		await route.continue();
	});
	const navigation = page.goto('/app/en/ordo/canon?dies=2026-04-02');
	const canonSlots = page.locator('.part').filter({
		has: page.locator('.part-title').filter({ hasText: /^(Communicántes|Hanc ígitur|Qui prídie)$/ })
	});
	await expect(canonSlots.locator('.part-loading')).toHaveCount(3);
	await expect(
		page.locator('.part.folded').filter({
			has: page.locator('.unfold-title').filter({ hasText: /Communicántes|Hanc ígitur|Qui prídie/ })
		})
	).toHaveCount(0);
	releaseScripts();
	await navigation;
	for (const ordinary of ['communicantes', 'hanc-igitur', 'qui-pridie'])
		await expect(page.locator(`[id="${ordinary}.w001"]`)).toHaveCount(0);
	await expect(canonSlots.locator('.part-loading')).toHaveCount(3);
	releaseCanon();
	await expect(page.locator('[id="qui-pridie-in-cena-domini.w001"]')).toHaveCount(1);
});

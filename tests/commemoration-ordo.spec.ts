import { expect, test } from './fixtures';

const MARK = 'dies=2026-04-25&missa=sancti-marci-evangelistae';

for (const language of ['pl', 'en'] as const) {
	const label =
		language === 'pl' ? 'wspomnienie: Litanie Większe' : 'commemoration: Greater Litanies';

	test(`${language} St Mark weekday joins the three Rogation orations after the Mass orations`, async ({
		page
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('scrutabor-role', 'sacerdos');
			localStorage.setItem('scrutabor-help', '1');
		});
		await page.goto(`/app/${language}/ordo/catechumenorum?${MARK}`);
		await expect(page.locator('[id="sancti-marci-evangelistae-collecta.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="litaniae-maiores-collecta.w001"]')).toHaveCount(1);
		await expect(page.locator('.commemoration-head .mark')).toHaveText(label);
		await expect(page.locator('a.part-title[href*="litaniae-maiores-collecta"]')).toHaveCount(1);
		// The Mass oration first, the commemoration's after it.
		const order = await page
			.locator(
				'[id="sancti-marci-evangelistae-collecta.w001"], [id="litaniae-maiores-collecta.w001"]'
			)
			.evaluateAll((nodes) => nodes.map((node) => node.id));
		expect(order).toEqual([
			'sancti-marci-evangelistae-collecta.w001',
			'litaniae-maiores-collecta.w001'
		]);

		await page.goto(`/app/${language}/ordo/offertorium?${MARK}`);
		await expect(page.locator('[id="sancti-marci-evangelistae-secreta.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="dominica-i-passionis-secreta.w001"]')).toHaveCount(1);
		// RG 480–481: the Mass's Secret keeps its terminal and Amen but says them quietly;
		// the commemoration's Secret, the last one, keeps the audible ending.
		await expect(page.locator('.quiet-note')).toHaveCount(1);
		await expect(page.locator('.quiet [id="sancti-marci-evangelistae-secreta.w046"]')).toHaveCount(
			1
		);
		await expect(page.locator('.quiet [id="sancti-marci-evangelistae-secreta.w050"]')).toHaveCount(
			1
		);
		await expect(page.locator('.quiet [id="dominica-i-passionis-secreta.w033"]')).toHaveCount(0);
		await expect(page.locator('.quiet [id="dominica-i-passionis-secreta.w037"]')).toHaveCount(0);

		await page.goto(`/app/${language}/ordo/conclusio?${MARK}`);
		await expect(page.locator('[id="sancti-marci-evangelistae-postcommunio.w001"]')).toHaveCount(1);
		await expect(page.locator('[id="litaniae-maiores-postcommunio.w001"]')).toHaveCount(1);
		await expect(page.locator('.commemoration-head .mark')).toHaveText(label);
		await expect(page).toHaveURL(/dies=2026-04-25/);
	});
}

test('an ordinary second-class Sunday takes the privileged commemoration, not Mark', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-04-25&missa=dominica-iv-post-pascha');
	await expect(page.locator('[id="dominica-iv-post-pascha-collecta.w001"]')).toHaveCount(1);
	await expect(page.locator('[id="litaniae-maiores-collecta.w001"]')).toHaveCount(1);
	await expect(page.locator('[id="sancti-marci-evangelistae-collecta.w001"]')).toHaveCount(0);
});

test('Low Sunday, first class, still admits the one privileged commemoration', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.goto('/app/en/ordo/conclusio?dies=2049-04-25&missa=dominica-in-albis');
	await expect(page.locator('[id="dominica-in-albis-postcommunio.w001"]')).toHaveCount(1);
	await expect(page.locator('[id="litaniae-maiores-postcommunio.w001"]')).toHaveCount(1);
});

test('a neighbouring day and Easter Sunday carry no commemoration', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-04-26&missa=dominica-iii-post-pascha');
	await expect(page.locator('[id="dominica-iii-post-pascha-collecta.w001"]')).toHaveCount(1);
	await expect(page.locator('[id="litaniae-maiores-collecta.w001"]')).toHaveCount(0);
	await expect(page.locator('.commemoration-head')).toHaveCount(0);
	await page.goto('/app/pl/ordo/offertorium?dies=2038-04-25&missa=dominica-resurrectionis');
	// Easter Sunday's Secret is the Vigil's, by reference.
	await expect(page.locator('[id="vigilia-paschalis-secreta.w001"]')).toHaveCount(1);
	await expect(page.locator('[id="dominica-i-passionis-secreta.w001"]')).toHaveCount(0);
	await expect(page.locator('.quiet-note')).toHaveCount(0);
	await expect(page.locator('.picker .state.commemoration-only')).toHaveCount(0);
});

test('the transferred Tuesday is acknowledged without a Mass and without substitution', async ({
	page
}) => {
	await page.goto('/app/pl/ordo/catechumenorum?dies=2038-04-27');
	await expect(page.locator('.picker .state.commemoration-only')).toContainText('Litanie Większe');
	await expect(page.locator('[id="litaniae-maiores-collecta.w001"]')).toHaveCount(0);
	await expect(page.locator('[id="sancti-marci-evangelistae-collecta.w001"]')).toHaveCount(0);
	await page.goto('/app/en/ordo/catechumenorum?dies=2030-04-25');
	await expect(page.locator('.picker .state.commemoration-only')).toContainText('Greater Litanies');
	await expect(page.locator('.commemoration-head')).toHaveCount(0);
});

test('a failed commemoration transport keeps the Mass incomplete instead of silently omitting it @online', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.route('**/artifacts/commemorationes/pl.json', (route) =>
		route.fulfill({ status: 503, body: 'unavailable' })
	);
	await page.goto(`/app/pl/ordo/catechumenorum?${MARK}`);
	await expect(page.locator('.part-loading')).toHaveCount(0);
	await expect(page.locator('[id="sancti-marci-evangelistae-collecta.w001"]')).toHaveCount(0);
	await expect(page.locator('[id="litaniae-maiores-collecta.w001"]')).toHaveCount(0);
	await expect(page.locator('.picker .state')).toContainText('nie udało');
});

for (const language of ['pl', 'en'] as const) {
	test(`${language} commemoration page reads the three orations as one set`, async ({ page }) => {
		await page.goto(`/app/${language}/commemoratio/litaniae-maiores`);
		await expect(page.locator('h1[lang="la"]')).toHaveText('Litaniæ maiores');
		await expect(page.locator('.proper-part')).toHaveCount(3);
		for (const slug of [
			'litaniae-maiores-collecta',
			'dominica-i-passionis-secreta',
			'litaniae-maiores-postcommunio'
		])
			await expect(page.locator(`[id="${slug}.w001"]`)).toHaveCount(1);
		await expect(page.locator('.subtitle')).toHaveText(
			language === 'pl' ? 'Litanie Większe' : 'Greater Litanies'
		);
	});
}

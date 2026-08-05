// The flow view: the Mass in order, for a reader following it in the pew.
import { expect, test } from '@playwright/test';

test('the flow walks the Mass, texts in place and slots marked', async ({ page }) => {
	await page.goto('/pl/ordo');
	await expect(page.locator('h1')).toHaveText('Ordo Missæ');

	// both halves of the Mass, in order
	const sections = page.locator('h2.section');
	await expect(sections.first()).toHaveText('msza katechumenów');
	await expect(sections.nth(1)).toHaveText('msza wiernych');
	// the whole ordo, not a sample: the Mass opens at the foot of the altar
	// and ends with the prayers after low Mass
	const titles = page.locator('.part-title');
	await expect(titles.first()).toContainText('Introíbo');
	await expect(titles.last()).toContainText('Preces Leonínæ');
	expect(await titles.count()).toBeGreaterThan(30);

	// the texts this edition carries are inlined in full (read at the bare
	// step, where the interlinear glosses do not interleave with the Latin)
	await page.locator('input[type="range"]').fill('0');
	const confiteor = page.locator('.part', { hasText: 'Confíteor' }).first();
	await expect(confiteor.locator('.verse').first()).toContainText('Confíteor Deo omnipoténti');
	// …and their titles lead to the study page
	await expect(confiteor.locator('a.part-title')).toHaveAttribute(
		'href',
		'/pl/ordinarium/confiteor'
	);

	// every text this edition carries appears in the flow, in order
	for (const slug of ['confiteor', 'gloria', 'credo', 'sanctus', 'agnus-dei']) {
		await expect(page.locator(`.part a[href="/pl/ordinarium/${slug}"]`)).toHaveCount(1);
	}

	// the day's own texts and the parts still to come are marked, not faked
	await expect(page.locator('.mark', { hasText: 'z formularza dnia' }).first()).toBeVisible();
	await expect(page.locator('.mark', { hasText: 'wkrótce w tym wydaniu' }).first()).toBeVisible();
	// a part we do not carry shows no text of its own
	const pending = page
		.locator('.part')
		.filter({ has: page.locator('.mark') })
		.first();
	await expect(pending.locator('.verse')).toHaveCount(0);
});

test('a word in the flow opens its analysis, wherever it stands', async ({ page }) => {
	await page.goto('/pl/ordo');
	// a word from the LAST inlined text, to prove every text is wired
	const agnus = page.locator('#agnus-dei\\:w001');
	await agnus.click();
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/pl/lemma/agnus');

	// switching to a word from a DIFFERENT text keeps working
	await page.locator('#credo\\:w001').click();
	await expect(panel.locator('.form')).toHaveText('Credo');

	// the deep link addresses text and word together, and survives a reload
	await expect(page).toHaveURL(/\?w=credo%3Aw001|\?w=credo:w001/);
	await page.reload();
	await expect(page.locator('aside .form')).toHaveText('Credo');

	// escape closes it, as everywhere else
	await page.keyboard.press('Escape');
	await expect(panel).toHaveCount(0);
});

test('a deep link into the flow lands on its word, not on the ribbon', async ({ page }) => {
	// leave a ribbon somewhere far from the target
	await page.goto('/pl/ordo');
	await page.evaluate(() => window.scrollTo(0, 3000));
	await page.waitForTimeout(1500);

	await page.goto('/pl/ordo?w=kyrie:w002');
	await expect(page.locator('aside .form')).toHaveText('eléison');
	await expect
		.poll(() =>
			page.evaluate(() => {
				const r = document.getElementById('kyrie:w002')?.getBoundingClientRect();
				return !!r && r.top >= 0 && r.bottom <= window.innerHeight;
			})
		)
		.toBe(true);
});

test('the flow and the reading page number their words apart', async ({ page }) => {
	await page.goto('/pl/ordo');
	// same corpus id in five texts, five distinct DOM ids — no collisions
	const first = await page.locator('.part-text .word').first().getAttribute('id');
	expect(first).toMatch(/^[a-z-]+:w\d{3}$/);
	const ids = await page.locator('.part-text .word').evaluateAll((els) => els.map((e) => e.id));
	expect(new Set(ids).size).toBe(ids.length);
	// the reading page keeps the bare corpus id, so its deep links are unchanged
	await page.goto('/pl/ordinarium/credo');
	expect(await page.locator('.word').first().getAttribute('id')).toBe('w001');
});

test('the help ladder governs the whole flow', async ({ page }) => {
	await page.goto('/en/ordo');
	const slider = page.locator('input[type="range"]');

	// default: interlinear glosses and the what-happens lines
	await expect(page.locator('.part-text rt').first()).toBeVisible();
	await expect(page.locator('.part-note').first()).toBeVisible();
	await expect(page.locator('.translation')).toHaveCount(0);

	await slider.fill('0');
	await expect(page.locator('.part-text rt')).toHaveCount(0);
	await expect(page.locator('.part-note')).toHaveCount(0);

	await slider.fill('2');
	await expect(page.locator('.translation').first()).toBeVisible();
});

test('the landing separates following the Mass from opening a text', async ({ page }) => {
	await page.goto('/en');
	const flow = page.locator('a.flow');
	await expect(flow).toContainText('Ordo Missæ');
	// it says which order of Mass this is — the edition, by name and year
	await expect(flow).toContainText('the order of Mass in the Roman Missal of 1962');

	// it stands above the catalog and outside it: no card links to the flow
	const firstSection = page.locator('main section').first();
	expect(
		await flow.evaluate(
			(el, section) => !!(el.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING),
			await firstSection.elementHandle()
		)
	).toBe(true);
	await expect(page.locator('.cards a[href$="/ordo"]')).toHaveCount(0);

	await flow.click();
	await expect(page).toHaveURL(/\/en\/ordo$/);
});

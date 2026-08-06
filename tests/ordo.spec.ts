// The flow view: the Mass in order, for a reader following it in the pew.
import { expect, test } from './fixtures';
import { ORDO } from '../src/lib/ordo';

test('the ordo is a map of six movements, walked in order', async ({ page }) => {
	await page.goto('/pl/ordo');
	await expect(page.locator('h1')).toHaveText('Ordo Missæ');
	const movements = page.locator('.movement');
	await expect(movements).toHaveCount(6);
	await expect(movements.first()).toContainText('Præparátio');
	await expect(movements.last()).toContainText('Conclúsio');

	// the Mass opens at the foot of the altar…
	await movements.first().click();
	await expect(page).toHaveURL(/\/pl\/ordo\/praeparatio$/);
	await expect(page.locator('.part-title').first()).toContainText('Introíbo');

	// …and the pager walks the movements to the end, where the prayers
	// after low Mass close it
	for (const id of ['catechumenorum', 'offertorium', 'canon', 'communio', 'conclusio']) {
		await page.locator('.pager-next').click();
		await expect(page).toHaveURL(new RegExp(`/pl/ordo/${id}$`));
	}
	await expect(page.locator('.part-title').last()).toContainText('Preces Leonínæ');
	await expect(page.locator('.pager-next')).toHaveCount(0);

	// every part of the spine appears on exactly one movement page — under
	// its own heading when it is shown, or as a row in the list of what the
	// reader is not saying, which is still the part being named
	let parts = 0;
	for (const m of ORDO) {
		await page.goto(`/pl/ordo/${m.id}`);
		parts += await page.locator('.part-title, .unfold-title').count();
	}
	expect(parts).toBe(ORDO.flatMap((m) => m.entries).length);
	await page.goto('/pl/ordo/catechumenorum');

	// the texts this edition carries are inlined in full (read at the bare
	// step, where the interlinear glosses do not interleave with the Latin)
	await page.goto('/pl/ordo/praeparatio');
	await page.locator('input[type="range"]').fill('0');
	// two Confiteors stand here now; this is the ministers', the one the
	// faithful say
	const confiteor = page.locator('.part', { hasText: 'Confíteor (Ministrórum)' }).first();
	await expect(confiteor.locator('.verse').first()).toContainText('Confíteor Deo omnipoténti');
	// …and their titles lead to the study page
	await expect(confiteor.locator('a.part-title')).toHaveAttribute(
		'href',
		'/pl/ordinarium/confiteor'
	);

	// every text this edition carries appears in the flow, on its movement
	for (const [slug, movement] of [
		['confiteor', 'praeparatio'],
		['kyrie', 'catechumenorum'],
		['gloria', 'catechumenorum'],
		['credo', 'catechumenorum'],
		['sanctus', 'canon'],
		['agnus-dei', 'communio']
	]) {
		await page.goto(`/pl/ordo/${movement}`);
		await expect(page.locator(`.part a[href="/pl/ordinarium/${slug}"]`)).toHaveCount(1);
	}
	await page.goto('/pl/ordo/catechumenorum');

	// the day's own texts are marked where they fall
	await expect(page.locator('.mark', { hasText: 'z formularza dnia' }).first()).toBeVisible();
	// and so are the parts still to come — the movements fill in as the
	// corpus grows, so look wherever any remain
	const remaining = ORDO.find((m) => m.entries.some((e) => e.kind === 'pending'));
	expect(remaining, 'no movement has a pending part left').toBeTruthy();
	await page.goto(`/pl/ordo/${remaining!.id}`);
	await expect(page.locator('.mark', { hasText: 'wkrótce w tym wydaniu' }).first()).toBeVisible();
	// a part we do not carry shows no text of its own
	const pending = page
		.locator('.part')
		.filter({ has: page.locator('.mark') })
		.first();
	await expect(pending.locator('.verse')).toHaveCount(0);
});

test('a word in the flow opens its analysis, wherever it stands', async ({ page }) => {
	await page.goto('/pl/ordo/communio');
	// a word from the LAST inlined text, to prove every text is wired
	const agnus = page.locator('[id="agnus-dei.w001"]');
	await agnus.click();
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/pl/lemma/agnus');

	// the deep link addresses text and word together, and survives a reload
	// (a dot is unreserved in a URL, so it makes the round trip unencoded)
	await expect(page).toHaveURL(/\?w=agnus-dei\.w001$/);
	await page.reload();
	await expect(page.locator('aside .form')).toHaveText('Agnus');

	// escape closes it, as everywhere else
	await page.keyboard.press('Escape');
	await expect(panel).toHaveCount(0);
});

test('a deep link into the flow lands on its word, not on the ribbon', async ({ page }) => {
	// leave a ribbon somewhere far from the target
	await page.goto('/pl/ordo/catechumenorum');
	await page.evaluate(() => window.scrollTo(0, 3000));
	await page.waitForTimeout(1500);

	await page.goto('/pl/ordo/catechumenorum?w=kyrie.w002');
	await expect(page.locator('aside .form')).toHaveText('eléison');
	await expect
		.poll(() =>
			page.evaluate(() => {
				const r = document.getElementById('kyrie.w002')?.getBoundingClientRect();
				return !!r && r.top >= 0 && r.bottom <= window.innerHeight;
			})
		)
		.toBe(true);
});

test('the flow and the reading page number their words apart', async ({ page }) => {
	await page.goto('/pl/ordo/catechumenorum');
	// same corpus id in five texts, five distinct DOM ids — no collisions
	const first = await page.locator('.part-text .word').first().getAttribute('id');
	expect(first).toMatch(/^[a-z-]+\.w\d{3}$/);
	const ids = await page.locator('.part-text .word').evaluateAll((els) => els.map((e) => e.id));
	expect(new Set(ids).size).toBe(ids.length);
	// the reading page keeps the bare corpus id, so its deep links are unchanged
	await page.goto('/pl/ordinarium/credo');
	expect(await page.locator('.word').first().getAttribute('id')).toBe('w001');
});

test('the help ladder governs the whole flow', async ({ page }) => {
	await page.goto('/en/ordo/catechumenorum');
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

test('every prayer the Ordo links to is actually built', async ({ page, request }) => {
	// The prerender list was the CATALOGUE, which orders the shelf but is
	// not the list of what exists: 27 texts — the whole Canon among them —
	// were linked from the Ordo and never built, so on the static site
	// those titles led to a 404 while the dev server served them happily.
	// A route that is linked has to be built, and the only way to know is
	// to follow the links.
	// as the celebrant, so nothing is folded and every part shows its title
	// as the link it is
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	const seen = new Set<string>();
	for (const m of ORDO) {
		await page.goto(`/pl/ordo/${m.id}`);
		const hrefs = await page.evaluate(() =>
			[...document.querySelectorAll('a.part-title')].map((a) => a.getAttribute('href')!)
		);
		for (const href of hrefs) seen.add(href);
	}
	expect(seen.size, 'the Ordo links to its texts').toBeGreaterThan(30);

	const missing: string[] = [];
	for (const href of seen) {
		const res = await request.get(href);
		if (!res.ok()) missing.push(`${href} → ${res.status()}`);
	}
	expect(missing).toEqual([]);
});

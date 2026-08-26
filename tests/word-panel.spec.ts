// The word-panel interaction matrix. Every test here encodes either a
// shipped behavior or a regression that actually happened (2026-08-04:
// taps reverted by the deep-link effect; panel not restored on back from
// a concept page) — keep them green.
import { setHelp, atRoute, expect, noWordInTheAddress, test } from './fixtures';

const PATER = '/app/pl/orationes/pater-noster';
const panel = 'aside';
const panelWord = 'aside .form';

test('tap opens the panel and mirrors the word into ?w=', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await expect(page.locator(panelWord)).toHaveText('nomen');
	await expect(page).toHaveURL(/\?w=w008$/);
});

test('tapping the same word closes and cleans the URL', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('#w008').click();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(atRoute('pater-noster'));
	await noWordInTheAddress(page);
});

test('switching words replaces history instead of pushing', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('#w014').click();
	await expect(page.locator(panelWord)).toHaveText('volúntas');
	// one back skips every intermediate word and lands on the clean entry
	await page.goBack();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(atRoute('pater-noster'));
	await noWordInTheAddress(page);
});

test('back closes the panel, forward reopens it', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w022').click();
	await expect(page.locator(panelWord)).toHaveText('Panem');
	await page.goBack();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(atRoute('pater-noster'));
	await noWordInTheAddress(page);
	await page.goForward();
	await expect(page.locator(panelWord)).toHaveText('Panem');
	await expect(page).toHaveURL(/\?w=w022$/);
});

test('clicking outside the sheet closes it', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('h1').click();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(atRoute('pater-noster'));
	await noWordInTheAddress(page);
});

test('Escape closes the sheet', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.keyboard.press('Escape');
	await expect(page.locator(panel)).toHaveCount(0);
});

test('a ?w= deep link opens the panel on arrival', async ({ page }) => {
	await page.goto(`${PATER}?w=w049`);
	await expect(page.locator(panelWord)).toHaveText('malo');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('closing a deep-linked panel strips ?w= without leaving the page', async ({ page }) => {
	await page.goto(`${PATER}?w=w049`);
	await page.locator('h1').click();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(atRoute('pater-noster'));
	await noWordInTheAddress(page);
	await expect(page.locator('h1')).toHaveText('Pater noster');
});

test('panel is restored on back from a grammar-concept page', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('aside a[href="/app/pl/grammatica/nominativus"]').click();
	await expect(page).toHaveURL(atRoute('grammatica/nominativus'));
	await page.goBack();
	await expect(page.locator(panelWord)).toHaveText('nomen');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('panel is restored on back from a lemma page', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('aside a[href="/app/pl/lemma/nomen"]').click();
	await expect(page).toHaveURL(atRoute('lemma/nomen'));
	await expect(page.locator('h1')).toHaveText('nomen');
	await page.goBack();
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

test('a concordance link deep-links into the reading view', async ({ page }) => {
	await page.goto('/app/pl/lemma/oro');
	await page.locator('a[href="/app/pl/ordinarium/confiteor?w=w060"]').click();
	await expect(page.locator(panelWord)).toHaveText('oráre');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('interactive chrome does not dismiss the sheet', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	// theme toggle does its job, panel stays
	await page.locator('button[aria-label="przełącz na tryb ciemny"]').click();
	await expect(page.locator(panelWord)).toHaveText('nomen');
	// reading mode changes, panel stays
	await setHelp(page, 2);
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

test('switching language keeps the panel open on the same word', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('button[aria-label="wybór języka"]').click();
	await page.locator('a', { hasText: 'English' }).click();
	await expect(page).toHaveURL(atRoute('/app/en/orationes/pater-noster', '?w=w008'));
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

test('the way out of a long panel does not scroll away', async ({ page }) => {
	// A word with senses, a contextual explanation and its sources outgrows the
	// sheet on a phone, so the sheet scrolls — and the HEADER scrolled with
	// it, trimming the word and carrying the × up out of the panel
	// altogether (owner, 2026-08-07): a sheet covering the prayer with no
	// visible way to close it.
	//
	// The word is pinned along with the ×, not just the ×. Everything below
	// is an answer to "what is this word", and the words a reader taps are
	// so often near-identical forms of one lemma that losing the question
	// two screens down is a real loss.
	// Use a small phone height so the behavior remains exercised even when
	// the prose in this particular analysis is edited or shortened.
	await page.setViewportSize({ width: 375, height: 568 });
	await page.goto('/app/en/ordinarium/memento-defunctorum?w=w026');

	const sheet = page.locator('aside.sheet');
	const header = sheet.locator('header');
	const inner = sheet.locator('.inner');
	await expect(sheet.locator('.form')).toHaveText('refrigérii');
	expect(
		await inner.evaluate((el) => el.scrollHeight > el.clientHeight),
		'this panel is long enough to scroll — pick a longer word if it stops being'
	).toBe(true);

	const before = await header.boundingBox();
	await inner.evaluate((el) => (el.scrollTop = el.scrollHeight));
	// the rule under the header shows only once something has gone up behind it
	await expect(header).toHaveClass(/scrolled/);

	const after = await header.boundingBox();
	expect(after!.y, 'the header held its place').toBeCloseTo(before!.y, 0);
	await expect(sheet.locator('.form')).toBeInViewport();
	await expect(sheet.locator('.close')).toBeInViewport();

	// and it still does what it is there for
	await sheet.locator('.close').click();
	await expect(sheet).toHaveCount(0);
});

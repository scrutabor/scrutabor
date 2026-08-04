// The word-panel interaction matrix. Every test here encodes either a
// shipped behavior or a regression that actually happened (2026-08-04:
// taps reverted by the deep-link effect; panel not restored on back from
// a concept page) — keep them green.
import { expect, test } from '@playwright/test';

const PATER = '/pl/orationes/pater-noster';
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
	await expect(page).toHaveURL(/pater-noster$/);
});

test('switching words replaces history instead of pushing', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('#w014').click();
	await expect(page.locator(panelWord)).toHaveText('volúntas');
	// one back skips every intermediate word and lands on the clean entry
	await page.goBack();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(/pater-noster$/);
});

test('back closes the panel, forward reopens it', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w022').click();
	await expect(page.locator(panelWord)).toHaveText('Panem');
	await page.goBack();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(/pater-noster$/);
	await page.goForward();
	await expect(page.locator(panelWord)).toHaveText('Panem');
	await expect(page).toHaveURL(/\?w=w022$/);
});

test('clicking outside the sheet closes it', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('h1').click();
	await expect(page.locator(panel)).toHaveCount(0);
	await expect(page).toHaveURL(/pater-noster$/);
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
	await expect(page).toHaveURL(/pater-noster$/);
	await expect(page.locator('h1')).toHaveText('Pater noster');
});

test('panel is restored on back from a grammar-concept page', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('aside a[href="/pl/grammatica/nominativus"]').click();
	await expect(page).toHaveURL(/grammatica\/nominativus$/);
	await page.goBack();
	await expect(page.locator(panelWord)).toHaveText('nomen');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('panel is restored on back from a lemma page', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('aside a[href="/pl/lemma/nomen"]').click();
	await expect(page).toHaveURL(/lemma\/nomen$/);
	await expect(page.locator('h1')).toHaveText('nomen');
	await page.goBack();
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

test('a concordance link deep-links into the reading view', async ({ page }) => {
	await page.goto('/pl/lemma/oro');
	await page.locator('a[href="/pl/ordinarium/confiteor?w=w060"]').click();
	await expect(page.locator(panelWord)).toHaveText('oráre');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('interactive chrome does not dismiss the sheet', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	// theme toggle does its job, panel stays
	await page.locator('button[aria-label="przełącz na tryb ciemny"]').click();
	await expect(page.locator(panelWord)).toHaveText('nomen');
	// help slider adjusts, panel stays
	await page.locator('input[type="range"]').fill('2');
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

test('switching language keeps the panel open on the same word', async ({ page }) => {
	await page.goto(PATER);
	await page.locator('#w008').click();
	await page.locator('button[aria-label="wybór języka"]').click();
	await page.locator('a', { hasText: 'English' }).click();
	await expect(page).toHaveURL(/\/en\/orationes\/pater-noster\?w=w008$/);
	await expect(page.locator(panelWord)).toHaveText('nomen');
});

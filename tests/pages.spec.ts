// The educational surfaces around the reading view: lemma pages,
// grammar-concept pages, and the landing.
import { expect, test } from '@playwright/test';

test('lemma page shows head, senses, derivatives and concordance', async ({ page }) => {
	await page.goto('/pl/lemma/panis');
	await expect(page.locator('h1')).toHaveText('panis');
	await expect(page.locator('.head')).toContainText('panis, panis');
	await expect(page.locator('.head')).toContainText('m.');
	await expect(page.locator('.pos')).toHaveText('rzeczownik, deklinacja III');
	await expect(page.locator('.senses')).toHaveText('chleb');
	await expect(page.locator('.derivatives')).toContainText('kompan, kompania');
	await expect(page.locator('a[href="/pl/orationes/pater-noster?w=w022"]')).toHaveText('Panem');
});

test('the external dictionary link opens in a new tab', async ({ page }) => {
	await page.goto('/pl/lemma/oro');
	const logeion = page.locator('.external a');
	await expect(logeion).toHaveAttribute('href', 'https://logeion.uchicago.edu/oro');
	await expect(logeion).toHaveAttribute('target', '_blank');
	await expect(logeion).toHaveAttribute('rel', /noopener/);
});

test('the j-lemma displays its liturgical headword', async ({ page }) => {
	// lemma key is normalized (Ioannes); the reader sees Joánnes
	await page.goto('/pl/lemma/Ioannes');
	await expect(page.locator('h1')).toHaveText('Joánnes');
});

test('grammatica index lists the concept tranche in groups', async ({ page }) => {
	await page.goto('/pl/grammatica');
	await expect(page.locator('.card')).toHaveCount(10);
	await expect(page.locator('h2', { hasText: 'przypadki' })).toBeVisible();
	await expect(page.locator('a[href="/pl/grammatica/ablativus"]')).toBeVisible();
});

test('a concept example deep-links into the prayer', async ({ page }) => {
	await page.goto('/en/grammatica/deponens');
	await expect(page.locator('h1')).toHaveText('deponent');
	await expect(page.locator('.latin-name')).toHaveText('verbum deponens');
	await page.locator('a[href="/en/ordinarium/confiteor?w=w001"]').click();
	await expect(page.locator('aside .form')).toHaveText('Confíteor');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('landing shows the catalog and a quiet grammar link', async ({ page }) => {
	await page.goto('/pl');
	await expect(page.locator('.card')).toHaveCount(4);
	await expect(page.locator('a[href="/pl/grammatica"]')).toBeVisible();
	await expect(page.locator('.motto')).toContainText('scrutabor legem tuam');
});
